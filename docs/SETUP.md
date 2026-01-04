# 🚀 快速設置指南

## Firebase Credentials 配置

有兩種方式配置 Firebase Service Account credentials：

### 方式 1：使用文件路徑（推薦本地開發）

在 `.env` 文件中：

```env
# 複製 Firebase service account 文件到專案根目錄
GOOGLE_CREDENTIALS_PATH=./firebase-service-account.json

# 或使用舊專案的文件
GOOGLE_CREDENTIALS_PATH=./firebase-service-account.liang-dev.json
```

**步驟**：
1. 從舊專案複製 Firebase service account JSON 文件
2. 在 `.env` 中設置 `GOOGLE_CREDENTIALS_PATH` 指向該文件
3. 確保該文件已加入 `.gitignore`（已設置）

### 方式 2：使用 Base64 編碼（推薦 Cloud Run 部署）

在 `.env` 文件中：

```env
# 生成 Base64 編碼
# base64 -i firebase-service-account.json | tr -d '\n'
GOOGLE_CREDENTIALS_BASE64=your-base64-encoded-credentials
```

**步驟**：
```bash
# 生成 Base64 編碼
base64 -i firebase-service-account.json | tr -d '\n'

# 複製輸出並設置到 .env 文件中的 GOOGLE_CREDENTIALS_BASE64
```

---

## 完整的 .env 配置範例

```env
# Server
PORT=8080
NODE_ENV=development
IMAGE_VERSION=0.0.1

# API
API_PREFIX=/api
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info

# Firebase (擇一設定 credentials)
FIREBASE_PROJECT_ID=liang-dev
FIREBASE_WEB_API_KEY=your-web-api-key
GOOGLE_CREDENTIALS_PATH=./firebase-service-account.liang-dev.json
# 或
# GOOGLE_CREDENTIALS_BASE64=your-base64-encoded-credentials
```

---

## 快速啟動

```bash
# 安裝依賴（如果還沒安裝）
npm install

# 開發模式運行
npm run start:dev

# 檢查健康狀態
# 瀏覽器訪問: http://localhost:8080/api
# 或
curl http://localhost:8080/api/health
```

---

## 錯誤排查

### Firebase 初始化失敗

如果看到以下錯誤：
```
❌ Failed to initialize Firebase Admin SDK: SyntaxError: ... is not valid JSON
```

**解決方法**：
1. 檢查 `.env` 文件中的 `GOOGLE_CREDENTIALS_PATH` 或 `GOOGLE_CREDENTIALS_BASE64` 是否正確設置
2. 如果使用 Base64，確保沒有換行符（使用 `tr -d '\n'` 移除）
3. 建議本地開發使用文件路徑方式（更簡單）

### PinoLogger 錯誤

如果看到：
```
PinoLogger is marked as a scoped provider...
```

這個問題已經在最新版本中修復。確保使用最新的程式碼。

---

## Docker 部署

```bash
# 建立映像
docker build -t firestore-demo-api-v2 .

# 運行容器（使用 Base64 方式）
docker run -p 8080:8080 \
  -e GOOGLE_CREDENTIALS_BASE64="your-base64-encoded-credentials" \
  -e FIREBASE_PROJECT_ID="liang-dev" \
  firestore-demo-api-v2
```
