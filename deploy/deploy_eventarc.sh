#!/bin/bash

# ============================================
# Eventarc Trigger 部署腳本
# ============================================

# 參數設定
PROJECT_ID="liang-dev"
LOCATION="us-west1"
TRIGGER_NAME="gcs-thumbnail-trigger"
CLOUD_RUN_SERVICE="firestore-demo-api-v2"
CLOUD_RUN_REGION="us-west1"
DESTINATION_PATH="/api/webhooks/gcs-finalized"
GCS_BUCKET="firestore-demo-api-v2"
SERVICE_ACCOUNT_EMAIL="138350987861-compute@developer.gserviceaccount.com" # 替換成你的 IAM account

# 顏色設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# 函數定義
# ============================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查 Eventarc trigger 是否已存在
check_trigger_exists() {
    log_info "檢查 Eventarc trigger 是否已存在..."

    if gcloud eventarc triggers describe "${TRIGGER_NAME}" \
        --project="${PROJECT_ID}" \
        --location="${LOCATION}" &>/dev/null; then
        return 0  # exists
    else
        return 1  # not exists
    fi
}

# 檢查 Service Account 是否存在
check_service_account_exists() {
    log_info "檢查 Service Account 是否存在: ${SERVICE_ACCOUNT_EMAIL}"

    if gcloud iam service-accounts describe "${SERVICE_ACCOUNT_EMAIL}" \
        --project="${PROJECT_ID}" &>/dev/null; then
        return 0  # exists
    else
        return 1  # not exists
    fi
}

# 檢查 Service Account 是否有 run.invoker 權限
check_run_invoker_permission() {
    log_info "檢查 Service Account 是否有 roles/run.invoker 權限..."

    # 取得 Cloud Run service 的 IAM policy
    local policy
    policy=$(gcloud run services get-iam-policy "${CLOUD_RUN_SERVICE}" \
        --project="${PROJECT_ID}" \
        --region="${CLOUD_RUN_REGION}" \
        --format="json" 2>/dev/null)

    if [ -z "$policy" ]; then
        log_error "無法取得 Cloud Run service IAM policy"
        return 1
    fi

    # 檢查是否有 run.invoker 權限
    if echo "$policy" | grep -q "serviceAccount:${SERVICE_ACCOUNT_EMAIL}" && \
       echo "$policy" | grep -q "roles/run.invoker"; then
        return 0  # has permission
    else
        return 1  # no permission
    fi
}

# 新增 run.invoker 權限
add_run_invoker_permission() {
    log_info "新增 roles/run.invoker 權限..."

    gcloud run services add-iam-policy-binding "${CLOUD_RUN_SERVICE}" \
        --project="${PROJECT_ID}" \
        --region="${CLOUD_RUN_REGION}" \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/run.invoker"

    if [ $? -eq 0 ]; then
        log_info "權限新增成功"
        return 0
    else
        log_error "權限新增失敗"
        return 1
    fi
}

# 建立 Service Account
create_service_account() {
    local sa_name="${SERVICE_ACCOUNT_EMAIL%%@*}"

    log_info "建立 Service Account: ${sa_name}"

    gcloud iam service-accounts create "${sa_name}" \
        --project="${PROJECT_ID}" \
        --display-name="Eventarc Trigger Service Account"

    if [ $? -eq 0 ]; then
        log_info "Service Account 建立成功"
        return 0
    else
        log_error "Service Account 建立失敗"
        return 1
    fi
}

# 建立 Eventarc trigger
create_eventarc_trigger() {
    log_info "建立 Eventarc trigger: ${TRIGGER_NAME}"

    gcloud eventarc triggers create "${TRIGGER_NAME}" \
        --project="${PROJECT_ID}" \
        --location="${LOCATION}" \
        --destination-run-service="${CLOUD_RUN_SERVICE}" \
        --destination-run-region="${CLOUD_RUN_REGION}" \
        --destination-run-path="${DESTINATION_PATH}" \
        --event-filters="type=google.cloud.storage.object.v1.finalized" \
        --event-filters="bucket=${GCS_BUCKET}" \
        --service-account="${SERVICE_ACCOUNT_EMAIL}"

    if [ $? -eq 0 ]; then
        log_info "Eventarc trigger 建立成功"
        return 0
    else
        log_error "Eventarc trigger 建立失敗"
        return 1
    fi
}

# ============================================
# 主程式
# ============================================

main() {
    echo "============================================"
    echo "Eventarc Trigger 部署腳本"
    echo "============================================"
    echo ""
    echo "專案: ${PROJECT_ID}"
    echo "位置: ${LOCATION}"
    echo "Trigger 名稱: ${TRIGGER_NAME}"
    echo "Cloud Run 服務: ${CLOUD_RUN_SERVICE}"
    echo "GCS Bucket: ${GCS_BUCKET}"
    echo "Service Account: ${SERVICE_ACCOUNT_EMAIL}"
    echo ""

    # Step 1: 檢查 trigger 是否已存在
    if check_trigger_exists; then
        log_info "Eventarc trigger '${TRIGGER_NAME}' 已存在，無需重複建立"
        exit 0
    fi

    # Step 2: 檢查 Service Account 是否存在
    if ! check_service_account_exists; then
        log_warn "Service Account 不存在: ${SERVICE_ACCOUNT_EMAIL}"
        echo ""
        read -p "是否要建立 Service Account? (y/n): " choice
        if [[ "$choice" == "y" || "$choice" == "Y" ]]; then
            if ! create_service_account; then
                exit 1
            fi
        else
            log_error "需要 Service Account 才能建立 Eventarc trigger"
            exit 1
        fi
    else
        log_info "Service Account 存在"
    fi

    # Step 3: 檢查 run.invoker 權限
    if ! check_run_invoker_permission; then
        log_warn "Service Account 沒有 roles/run.invoker 權限"
        echo ""
        read -p "是否要新增權限? (y/n): " choice
        if [[ "$choice" == "y" || "$choice" == "Y" ]]; then
            if ! add_run_invoker_permission; then
                exit 1
            fi
        else
            log_error "需要 roles/run.invoker 權限才能建立 Eventarc trigger"
            exit 1
        fi
    else
        log_info "Service Account 已有 roles/run.invoker 權限"
    fi

    # Step 4: 建立 Eventarc trigger
    echo ""
    if create_eventarc_trigger; then
        echo ""
        log_info "部署完成!"
        echo ""
        echo "測試方式:"
        echo "  1. 上傳檔案到 GCS bucket: gs://${GCS_BUCKET}/"
        echo "  2. 查看 Cloud Run logs 確認收到事件"
    else
        exit 1
    fi
}

# 執行主程式
main
