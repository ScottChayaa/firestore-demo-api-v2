# Firestore Demo API v2

基於 NestJS + Firebase + Firestore 的會員訂單管理系統

---

## 功能特點

### 核心功能
- 🔐 **Firebase Authentication** - 會員/管理員雙角色認證系統
- 👥 **會員管理** - 完整 CRUD、軟刪除、狀態切換、密碼重置
- 👑 **管理員管理** - 管理員 CRUD、角色賦予、權限控制
- 📦 **商品管理** - 公開 API、分類篩選、庫存管理
- 📋 **訂單系統** - 多條件查詢、狀態管理、自動編號生成
- 📧 **郵件服務** - Nodemailer + SMTP、歡迎郵件、密碼重置

### 技術特色
- 🔄 **Cursor-based Pagination** - 高效能分頁查詢
- 📊 **結構化日誌** - Pino Logger with Cloud Logging 格式
- 🛡️ **Rate Limiting** - API 頻率限制防止濫用
- 🔍 **DTO Validation** - 自動驗證和型別轉換
- 🎯 **Custom Claims** - Firebase 自訂聲明支援多角色
- 🧹 **Soft Delete** - 軟刪除和恢復功能
- 🚀 **Docker Ready** - 容器化部署支援

---

## 快速開始

### 前置需求

- Node.js >= 20.x
- npm >= 10.x
- Firebase 專案（含 Firestore 和 Authentication）

### 安裝

```bash
# 1. Clone 專案
git clone <repository-url>
cd firestore-demo-api-v2

# 2. 安裝依賴
npm install

# 3. 設定環境變數
cp .env.example .env
cp env.example.yaml env.yaml

# 編輯 env，填入 Firebase 配置（詳見下方說明）
```

### Firebase 設定

1. **下載 Service Account JSON**：
   - 前往 Firebase Console > 專案設定 > 服務帳戶
   - 產生新私密金鑰並下載 JSON 檔案
   - 將檔案放在專案根目錄（例如 `firebase-service-account.json`）
   - 生成 base64 憑證 : base64 -i firebase-service-account.json | tr -d '\n'
     - 設置到 .env 文件中的 GOOGLE_CREDENTIALS_BASE64

2. **更新 `.env` 檔案**：

依照 env 裡面的註解配置相關設定, 重點 :
 - FIREBASE_PROJECT_ID
 - FIREBASE_WEB_API_KEY
 - FIRESTORE_DATABASE_ID
 - GOOGLE_CREDENTIALS_BASE64

### 啟動開發伺服器

```bash
# 開發模式（hot-reload）
npm run start:dev
```

應用程式將在 `http://localhost:8080/api` 啟動。

### 生成測試資料

```bash
# 清理所有資料
npm run clean:all

# 生成測試資料（10 會員、10 商品、50 訂單、1 管理員）
npm run seed

# 查看預設登入帳號
# 管理員: admin@example.com (密碼: qwer1234)
# 會員: member1@example.com ~ member10@example.com (密碼: qwer1234)
```

---

## API 測試

參考 rest client 範例 : 
 - [public.example.rest](./rests/public.example.rest) : 公開 API 測試
 - [member.example.rest](./rests/member.example.rest) : 會員 API 測試
 - [admin.example.rest](./rests/admin.example.rest) : 管理員 API 測試

---

## 相關文檔

- [Firebase Console](https://console.firebase.google.com/)
- [NestJS 官方文檔](https://docs.nestjs.com/)
