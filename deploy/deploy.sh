#!/bin/bash

# ========================================
# Cloud Run 自動化部署腳本
# ========================================

# 配置
PROJECT_ID="liang-dev"
REGION="asia-east1"
SERVICE_NAME="firestore-demo-api-v2"
DOCKER_REGISTRY="asia-east1-docker.pkg.dev"
DOCKER_REPO="my-docker"
ENV_FILE="env.liang-dev.yaml"

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 錯誤處理
set -e
trap 'echo -e "${RED}✗ 部署失敗！${NC}"' ERR

# ========================================
# 步驟 1: 前置檢查函數
# ========================================
check_prerequisites() {
  echo -e "${BLUE}[1/8] 執行前置檢查...${NC}"

  # 檢查 gcloud CLI
  if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}✗ 錯誤：gcloud CLI 未安裝${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ gcloud CLI 已安裝${NC}"

  # 檢查 docker
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ 錯誤：Docker 未安裝${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Docker 已安裝${NC}"

  # 檢查 gcloud 登入狀態
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}✗ 錯誤：尚未登入 gcloud${NC}"
    echo -e "${YELLOW}請執行：gcloud auth login${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ gcloud 已登入${NC}"

  # 檢查當前專案
  CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
  if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠ 當前專案：$CURRENT_PROJECT${NC}"
    echo -e "${YELLOW}⚠ 預期專案：$PROJECT_ID${NC}"
    echo -e "${YELLOW}正在切換專案...${NC}"
    gcloud config set project $PROJECT_ID
  fi
  echo -e "${GREEN}✓ 專案設定正確：$PROJECT_ID${NC}"

  # 檢查必要檔案
  if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}✗ 錯誤：找不到 Dockerfile${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Dockerfile 存在${NC}"

  if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}✗ 錯誤：找不到 $ENV_FILE${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ $ENV_FILE 存在${NC}"

  # 檢查 Git 工作目錄狀態
  if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}✗ 錯誤：Git 工作目錄不乾淨${NC}"
    echo -e "${YELLOW}有未提交的更改：${NC}"
    git status --short
    echo -e "${YELLOW}請先提交或暫存更改後再部署${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Git 工作目錄乾淨${NC}"
}

# ========================================
# 步驟 2: 輸入版本號
# ========================================
get_version() {
  echo ""
  echo -e "${BLUE}[2/9] 輸入版本號...${NC}"

  # 顯示最近的 tags
  echo -e "${YELLOW}最近的版本標籤：${NC}"
  git tag --sort=-v:refname | head -5 || echo "（尚無標籤）"
  echo ""

  # 輸入版本號
  read -p "請輸入版本號（例如 v1.0.0 或 1.0.0）: " VERSION

  # 驗證版本號格式
  if [ -z "$VERSION" ]; then
    echo -e "${RED}✗ 錯誤：版本號不能為空${NC}"
    exit 1
  fi

  # 檢查 tag 是否已存在
  if git rev-parse "$VERSION" >/dev/null 2>&1; then
    echo -e "${RED}✗ 錯誤：Git tag '$VERSION' 已存在${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ 版本號：$VERSION${NC}"
}

# ========================================
# 步驟 3: 更新版本號到所有配置檔案
# ========================================
update_image_version() {
  echo ""
  echo -e "${BLUE}[3/9] 更新版本號到所有配置檔案...${NC}"

  # 定義需要更新的環境變數檔案
  ENV_FILES=(
    ".env"
    ".env.liang-dev"
    "env.yaml"
    "env.liang-dev.yaml"
  )

  # 更新環境變數檔案中的 IMAGE_VERSION
  for FILE in "${ENV_FILES[@]}"; do
    if [ ! -f "$FILE" ]; then
      echo -e "${YELLOW}⚠ 檔案不存在，跳過：$FILE${NC}"
      continue
    fi

    # 檢查檔案格式
    if [[ "$FILE" == *.yaml ]]; then
      # YAML 格式：IMAGE_VERSION: "版本號"
      if sed --version &>/dev/null; then
        # GNU sed (Linux)
        sed -i "s/^IMAGE_VERSION:.*$/IMAGE_VERSION: \"$VERSION\"/" "$FILE"
      else
        # BSD sed (macOS)
        sed -i '' "s/^IMAGE_VERSION:.*$/IMAGE_VERSION: \"$VERSION\"/" "$FILE"
      fi
    else
      # bash 格式：IMAGE_VERSION=版本號
      if sed --version &>/dev/null; then
        # GNU sed (Linux)
        sed -i "s/^IMAGE_VERSION=.*$/IMAGE_VERSION=$VERSION/" "$FILE"
      else
        # BSD sed (macOS)
        sed -i '' "s/^IMAGE_VERSION=.*$/IMAGE_VERSION=$VERSION/" "$FILE"
      fi
    fi

    echo -e "${GREEN}✓ 已更新：$FILE -> IMAGE_VERSION=$VERSION${NC}"
  done

  echo -e "${GREEN}✓ 所有版本號已同步更新${NC}"
}

# ========================================
# 步驟 4: 建立 Docker 映像
# ========================================
build_docker_image() {
  echo ""
  echo -e "${BLUE}[4/9] 建立 Docker 映像...${NC}"

  IMAGE_NAME="$DOCKER_REGISTRY/$PROJECT_ID/$DOCKER_REPO/$SERVICE_NAME:$VERSION"

  docker build -t "$IMAGE_NAME" .

  echo -e "${GREEN}✓ Docker 映像建立成功：$IMAGE_NAME${NC}"
}

# ========================================
# 步驟 5: 建立 Git tag
# ========================================
create_git_tag() {
  echo ""
  echo -e "${BLUE}[5/9] 建立 Git tag...${NC}"

  git tag -a "$VERSION" -m "Release $VERSION"

  echo -e "${GREEN}✓ Git tag 建立成功：$VERSION${NC}"
}

# ========================================
# 步驟 6: 配置 Docker 認證
# ========================================
configure_docker_auth() {
  echo ""
  echo -e "${BLUE}[6/9] 配置 Docker 認證...${NC}"

  gcloud auth configure-docker $DOCKER_REGISTRY --quiet

  echo -e "${GREEN}✓ Docker 認證配置完成${NC}"
}

# ========================================
# 步驟 7: 推送 Docker 映像
# ========================================
push_docker_image() {
  echo ""
  echo -e "${BLUE}[7/9] 推送 Docker 映像到 Container Registry...${NC}"

  docker push "$IMAGE_NAME"

  echo -e "${GREEN}✓ Docker 映像推送成功${NC}"
}

# ========================================
# 步驟 8: 部署到 Cloud Run
# ========================================
deploy_to_cloud_run() {
  echo ""
  echo -e "${BLUE}[8/9] 部署到 Cloud Run...${NC}"

  gcloud run deploy $SERVICE_NAME \
    --image "$IMAGE_NAME" \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --env-vars-file $ENV_FILE \
    --memory 512Mi \
    --max-instances 10 \
    --timeout 300 \
    --project $PROJECT_ID

  echo -e "${GREEN}✓ Cloud Run 部署成功${NC}"
}

# ========================================
# 步驟 9: 顯示部署資訊
# ========================================
show_deployment_info() {
  echo ""
  echo -e "${BLUE}[9/9] 取得部署資訊...${NC}"

  SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region $REGION \
    --format="value(status.url)")

  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}✓ 部署完成！${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo -e "${BLUE}版本：${NC}$VERSION"
  echo -e "${BLUE}映像：${NC}$IMAGE_NAME"
  echo -e "${BLUE}服務 URL：${NC}$SERVICE_URL"
  echo -e "${GREEN}========================================${NC}"
  echo ""

  # 可選：執行健康檢查
  read -p "是否執行健康檢查？(Y/n): " HEALTH_CHECK
  if [[ ! "$HEALTH_CHECK" =~ ^[Nn]$ ]]; then
    echo -e "${BLUE}執行健康檢查...${NC}"
    if curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health" | grep -q "200"; then
      echo -e "${GREEN}✓ 健康檢查通過${NC}"
    else
      echo -e "${RED}✗ 健康檢查失敗${NC}"
    fi
  fi
}

# ========================================
# 主流程
# ========================================
main() {
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}Cloud Run 自動化部署腳本${NC}"
  echo -e "${GREEN}========================================${NC}"

  check_prerequisites
  get_version
  update_image_version
  build_docker_image
  create_git_tag
  configure_docker_auth
  push_docker_image
  deploy_to_cloud_run
  show_deployment_info

  echo -e "${GREEN}✓ 所有步驟完成！${NC}"
}

# 執行主流程
main
