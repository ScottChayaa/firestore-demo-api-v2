# 環境變數配置說明

本文檔說明 `firestore-demo-api-v2` 專案的環境變數配置。

## 📁 配置檔案

專案支援兩種配置方式：

1. **`.env` 檔案**：本地開發環境（不應提交到 Git）
2. **`env.yaml` 檔案**：Cloud Run 部署環境（不應提交到 Git）

請複製 `.env.example` 作為起點：

```bash
cp .env.example .env
```

---

## 🔧 配置項目說明

### Server Configuration

#### `PORT`
- **說明**：應用程式監聽的埠號
- **預設值**：`8080`
- **範例**：`PORT=8080`

#### `NODE_ENV`
- **說明**：執行環境
- **可選值**：`development` | `production`
- **預設值**：`development`
- **範例**：`NODE_ENV=production`

#### `IMAGE_VERSION`
- **說明**：Docker 映像版本號
- **預設值**：`0.0.1`
- **範例**：`IMAGE_VERSION=1.0.0`

---

### API Configuration

#### `API_PREFIX`
- **說明**：API 路由前綴
- **預設值**：`/api`
- **範例**：`API_PREFIX=/api/v1`

#### `CORS_ORIGIN`
- **說明**：CORS 允許的來源
- **預設值**：`*`（允許所有來源）
- **範例**：`CORS_ORIGIN=https://example.com`

---

### Logging Configuration

#### `LOG_LEVEL`
- **說明**：日誌級別
- **可選值**：`trace` | `debug` | `info` | `warn` | `error` | `fatal`
- **預設值**：`info`
- **建議**：
  - 開發環境：`debug`
  - 生產環境：`info` 或 `warn`

#### `LOG_RESPONSE_BODY`
- **說明**：是否記錄 HTTP Response Body
- **可選值**：`true` | `false`
- **預設值**：`false`
- **建議**：
  - 開發環境：`true`（方便除錯）
  - 生產環境：`false`（避免敏感資料外洩）

#### `MAX_RESPONSE_BODY_LENGTH`
- **說明**：Response Body 最大記錄長度（字元數）
- **預設值**：`10000`
- **範例**：`MAX_RESPONSE_BODY_LENGTH=5000`

---

### Firebase Configuration

#### `FIREBASE_PROJECT_ID`
- **說明**：Firebase 專案 ID
- **必填**：是
- **取得方式**：Firebase Console > 專案設定 > 一般 > 專案 ID
- **範例**：`FIREBASE_PROJECT_ID=my-firebase-project`

#### `FIREBASE_WEB_API_KEY`
- **說明**：Firebase Web API 金鑰
- **必填**：是
- **取得方式**：Firebase Console > 專案設定 > 一般 > 網頁 API 金鑰
- **範例**：`FIREBASE_WEB_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

#### `FIRESTORE_DATABASE_ID`
- **說明**：Firestore 資料庫 ID
- **預設值**：`(default)`
- **範例**：`FIRESTORE_DATABASE_ID=(default)`

#### `GOOGLE_CREDENTIALS_BASE64`
- **說明**：Firebase Service Account JSON 的 Base64 編碼
- **必填**：是（與 `GOOGLE_CREDENTIALS_PATH` 擇一）
- **如何生成**：
  ```bash
  base64 -i firebase-service-account.json | tr -d '\n'
  ```
- **用途**：Cloud Run 部署時使用
- **範例**：`GOOGLE_CREDENTIALS_BASE64=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### `GOOGLE_CREDENTIALS_PATH`
- **說明**：Firebase Service Account JSON 檔案路徑
- **必填**：否（與 `GOOGLE_CREDENTIALS_BASE64` 擇一）
- **用途**：本地開發時使用（推薦）
- **範例**：`GOOGLE_CREDENTIALS_PATH=/path/to/firebase-service-account.json`
- **注意**：此檔案不應提交到 Git（已加入 `.gitignore`）

#### `ENABLE_FIRESTORE_WARMUP`
- **說明**：是否啟用 Firestore 連線預熱
- **可選值**：`true` | `false`
- **預設值**：`false`
- **建議**：
  - 開發環境：`false`
  - 生產環境：`true`（提升首次請求速度）

---

### Pagination Configuration

#### `DEFAULT_PAGE_LIMIT`
- **說明**：分頁查詢預設每頁筆數
- **預設值**：`20`
- **範例**：`DEFAULT_PAGE_LIMIT=50`

#### `MAX_PAGE_LIMIT`
- **說明**：分頁查詢最大每頁筆數
- **預設值**：`100`
- **範例**：`MAX_PAGE_LIMIT=200`

---

### SMTP Configuration (Mail Service)

#### `SMTP_HOST`
- **說明**：SMTP 伺服器主機
- **預設值**：`smtp.gmail.com`
- **範例**：
  - Gmail：`smtp.gmail.com`
  - Outlook：`smtp.office365.com`
  - Yahoo：`smtp.mail.yahoo.com`

#### `SMTP_PORT`
- **說明**：SMTP 伺服器埠號
- **預設值**：`587`
- **常用埠號**：
  - `587`：STARTTLS（推薦）
  - `465`：SSL
  - `25`：未加密（不建議）

#### `SMTP_USER`
- **說明**：SMTP 使用者名稱（通常是電子郵件地址）
- **必填**：是
- **範例**：`SMTP_USER=your-email@gmail.com`

#### `SMTP_PASSWORD`
- **說明**：SMTP 密碼
- **必填**：是
- **Gmail 特別說明**：
  1. 啟用兩步驟驗證
  2. 產生應用程式密碼：https://myaccount.google.com/apppasswords
  3. 使用應用程式密碼（16 位數）作為 `SMTP_PASSWORD`
- **範例**：`SMTP_PASSWORD=abcd efgh ijkl mnop`

#### `SMTP_FROM_EMAIL`
- **說明**：寄件人電子郵件地址
- **預設值**：與 `SMTP_USER` 相同
- **範例**：`SMTP_FROM_EMAIL=noreply@example.com`

#### `SMTP_FROM_NAME`
- **說明**：寄件人名稱
- **預設值**：`Firestore Demo API`
- **範例**：`SMTP_FROM_NAME=我的應用程式`

---

### Rate Limiting Configuration

#### `EMAIL_RATE_LIMIT_MINUTES`
- **說明**：郵件發送頻率限制（分鐘）
- **預設值**：`2`
- **範例**：`EMAIL_RATE_LIMIT_MINUTES=5`

#### `EMAIL_MAX_REQUESTS_PER_DAY`
- **說明**：每日最大郵件發送次數
- **預設值**：`50`
- **範例**：`EMAIL_MAX_REQUESTS_PER_DAY=100`

---

### Seed Data Configuration

#### `SEED_MEMBERS_COUNT`
- **說明**：測試資料生成 - 會員數量
- **預設值**：`10`
- **範例**：`SEED_MEMBERS_COUNT=100`

#### `SEED_ORDERS_COUNT`
- **說明**：測試資料生成 - 訂單數量
- **預設值**：`50`
- **範例**：`SEED_ORDERS_COUNT=500`

#### `SEED_PRODUCTS_COUNT`
- **說明**：測試資料生成 - 商品數量
- **預設值**：`10`
- **範例**：`SEED_PRODUCTS_COUNT=50`

---

## 🚀 快速設定指南

### 本地開發環境

1. **複製範例檔案**：
   ```bash
   cp .env.example .env
   ```

2. **設定 Firebase**：
   - 下載 Firebase Service Account JSON 檔案
   - 將檔案放在專案根目錄（例如 `firebase-service-account.json`）
   - 更新 `.env`：
     ```env
     FIREBASE_PROJECT_ID=your-project-id
     FIREBASE_WEB_API_KEY=your-web-api-key
     GOOGLE_CREDENTIALS_PATH=./firebase-service-account.json
     ```

3. **設定 SMTP（可選）**：
   - 如果需要郵件功能，設定 Gmail 應用程式密碼
   - 更新 `.env`：
     ```env
     SMTP_USER=your-email@gmail.com
     SMTP_PASSWORD=your-app-password
     SMTP_FROM_EMAIL=your-email@gmail.com
     ```

4. **啟動應用程式**：
   ```bash
   npm run start:dev
   ```

---

### Cloud Run 部署環境

1. **準備 `env.yaml`**：
   ```yaml
   PORT: "8080"
   NODE_ENV: "production"
   FIREBASE_PROJECT_ID: "your-project-id"
   FIREBASE_WEB_API_KEY: "your-web-api-key"
   GOOGLE_CREDENTIALS_BASE64: "your-base64-encoded-credentials"
   ```

2. **生成 Base64 憑證**：
   ```bash
   base64 -i firebase-service-account.json | tr -d '\n'
   ```

3. **部署**：
   ```bash
   gcloud run deploy firestore-demo-api-v2 \
     --source . \
     --env-vars-file env.yaml \
     --region asia-east1
   ```

---

## 🔐 安全性注意事項

### 絕對不要提交到 Git 的檔案

- `.env` - 本地環境變數
- `env.yaml` - Cloud Run 環境變數
- `firebase-service-account.json` - Firebase 憑證
- `*-service-account.json` - 任何服務帳號憑證

這些檔案已加入 `.gitignore`。

### 敏感資訊處理

- **開發環境**：使用 `.env` 檔案
- **生產環境**：使用 Cloud Run Secret Manager 或環境變數
- **永遠不要**：在程式碼中硬編碼敏感資訊

---

## ❓ 常見問題

### Q: Firebase 憑證應該使用哪種方式？

**A:**
- **本地開發**：使用 `GOOGLE_CREDENTIALS_PATH`（推薦）
- **Cloud Run**：使用 `GOOGLE_CREDENTIALS_BASE64`

### Q: Gmail SMTP 驗證失敗怎麼辦？

**A:**
1. 確認已啟用兩步驟驗證
2. 使用應用程式密碼，而非 Gmail 帳號密碼
3. 應用程式密碼產生：https://myaccount.google.com/apppasswords

### Q: 如何查看當前配置是否正確？

**A:**
```bash
npm run start:dev
```
啟動時會顯示 Nodemailer 和 Firebase 初始化訊息，檢查日誌確認配置正確。

---

## 📚 相關文檔

- [Firebase Console](https://console.firebase.google.com/)
- [Gmail 應用程式密碼](https://myaccount.google.com/apppasswords)
- [Cloud Run 環境變數](https://cloud.google.com/run/docs/configuring/environment-variables)
- [NestJS ConfigModule](https://docs.nestjs.com/techniques/configuration)
