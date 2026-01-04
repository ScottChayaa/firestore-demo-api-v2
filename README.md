# Firestore Demo API v2

基於 NestJS + Firebase + Firestore 的會員訂單管理系統

## 技術棧

- **Framework**: NestJS v11+
- **Language**: TypeScript 5.9+
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Logger**: Pino (nestjs-pino)
- **Validation**: class-validator + class-transformer
- **Mail Service**: Nodemailer
- **Rate Limiting**: @nestjs/throttler
- **Runtime**: Node.js 20+

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
# 編輯 .env，填入 Firebase 配置（詳見下方說明）
```

### Firebase 設定

1. **下載 Service Account JSON**：
   - 前往 Firebase Console > 專案設定 > 服務帳戶
   - 產生新私密金鑰並下載 JSON 檔案
   - 將檔案放在專案根目錄（例如 `firebase-service-account.json`）

2. **更新 `.env` 檔案**：
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_WEB_API_KEY=your-web-api-key
   GOOGLE_CREDENTIALS_PATH=./firebase-service-account.json
   ```

3. **（可選）設定 SMTP 郵件服務**：
   ```env
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   ```

詳細配置說明請參閱：[環境變數配置文檔](docs/ENV_CONFIGURATION.md)

### 啟動開發伺服器

```bash
# 開發模式（hot-reload）
npm run start:dev

# 生產模式
npm run build
npm run start:prod
```

應用程式將在 `http://localhost:8080/api` 啟動。

### 生成測試資料

```bash
# 生成測試資料（10 會員、10 商品、50 訂單、1 管理員）
npm run seed

# 查看預設登入帳號
# 管理員: admin@example.com (密碼: qwer1234)
# 會員: member1@example.com ~ member10@example.com (密碼: qwer1234)
```

### 清理測試資料

```bash
# 清理 Firestore 資料
npm run clean:firestore

# 清理 Firebase Auth 用戶
npm run clean:auth

# 清理所有資料
npm run clean:all
```

---

## API 端點

### 公開端點（無需認證）

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/register` | 會員註冊 |
| POST | `/api/auth/member/signInWithPassword` | 會員登入 |
| POST | `/api/auth/admin/signInWithPassword` | 管理員登入 |
| POST | `/api/auth/forgot-password` | 忘記密碼 |
| GET  | `/api/products` | 查詢商品列表 |
| GET  | `/api/products/categories` | 取得商品分類 |
| GET  | `/api/products/:id` | 取得單一商品 |
| POST | `/api/send-email` | 發送郵件（有頻率限制） |

### 會員端點（需要 member 角色）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET  | `/api/member` | 取得自己的資料 |
| PUT  | `/api/member` | 更新自己的資料 |
| GET  | `/api/member/orders` | 查詢自己的訂單 |

### 管理員端點（需要 admin 角色）

#### 會員管理
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET    | `/api/admin/members` | 查詢所有會員 |
| GET    | `/api/admin/members/:id` | 取得單一會員 |
| POST   | `/api/admin/members` | 建立會員 |
| POST   | `/api/admin/members/assign-role` | 賦予現有帳號會員角色 |
| PUT    | `/api/admin/members/:id` | 更新會員資料 |
| DELETE | `/api/admin/members/:id` | 軟刪除會員 |
| POST   | `/api/admin/members/:id/restore` | 恢復已刪除會員 |
| PATCH  | `/api/admin/members/:id/toggle-status` | 切換會員啟用狀態 |
| PATCH  | `/api/admin/members/:id/password` | 更新會員密碼 |

#### 管理員管理
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET    | `/api/admin/admins` | 查詢所有管理員 |
| GET    | `/api/admin/admins/:id` | 取得單一管理員 |
| POST   | `/api/admin/admins` | 建立管理員 |
| POST   | `/api/admin/admins/assign-role` | 賦予現有帳號管理員角色 |
| PUT    | `/api/admin/admins/:id` | 更新管理員資料 |
| DELETE | `/api/admin/admins/:id` | 軟刪除管理員 |
| POST   | `/api/admin/admins/:id/restore` | 恢復已刪除管理員 |
| PATCH  | `/api/admin/admins/:id/toggle-status` | 切換管理員啟用狀態 |
| PATCH  | `/api/admin/admins/:id/password` | 更新管理員密碼 |

#### 訂單管理
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET    | `/api/admin/orders` | 查詢所有訂單 |
| GET    | `/api/admin/orders/:id` | 取得單一訂單 |
| POST   | `/api/admin/orders` | 建立訂單 |
| PUT    | `/api/admin/orders/:id` | 更新訂單狀態 |
| DELETE | `/api/admin/orders/:id` | 刪除訂單 |

---

## 專案結構

```
firestore-demo-api-v2/
├── src/
│   ├── admins/              # 管理員模組
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── dto/
│   │   └── entities/
│   ├── members/             # 會員模組
│   ├── orders/              # 訂單模組
│   ├── products/            # 商品模組
│   ├── auth/                # 認證模組
│   ├── mail/                # 郵件服務模組
│   ├── firebase/            # Firebase 設定模組
│   ├── common/              # 共用模組
│   │   ├── decorators/      # 自訂裝飾器
│   │   ├── guards/          # 認證守衛
│   │   ├── filters/         # 異常過濾器
│   │   ├── dto/             # 共用 DTO
│   │   └── pagination/      # 分頁輔助工具
│   ├── config/              # 配置管理
│   ├── scripts/             # 工具腳本
│   └── main.ts              # 應用程式入口
├── docs/                    # 文檔目錄
│   └── ENV_CONFIGURATION.md # 環境變數配置說明
├── rests/                   # REST Client 測試檔案
├── .env.example             # 環境變數範例
├── Dockerfile               # Docker 配置
└── README.md                # 專案說明文件
```

---

## 開發指南

### 可用 Scripts

```bash
# 開發
npm run start:dev          # 啟動開發伺服器（hot-reload）
npm run build              # 建置專案
npm run start:prod         # 啟動生產伺服器

# 測試資料
npm run seed               # 生成測試資料
npm run clean:firestore    # 清理 Firestore 資料
npm run clean:auth         # 清理 Auth 用戶
npm run clean:all          # 清理所有資料

# 程式碼品質
npm run lint               # ESLint 檢查
npm run format             # Prettier 格式化
npm run test               # 執行單元測試
npm run test:e2e           # 執行 E2E 測試
```

### 測試

使用 REST Client 測試：

```bash
# 安裝 VS Code 擴充套件：REST Client
# 開啟 rests/*.rest 檔案進行測試
```

測試檔案：
- `rests/public.example.rest` - 公開 API 測試
- `rests/member.example.rest` - 會員 API 測試
- `rests/admin.example.rest` - 管理員 API 測試

---

## 部署

### Docker 部署

```bash
# 建置 Docker 映像
docker build -t firestore-demo-api-v2:latest .

# 執行容器
docker run -p 8080:8080 --env-file .env firestore-demo-api-v2:latest
```

### Google Cloud Run 部署

```bash
# 1. 準備 env.yaml
cp .env.example env.yaml
# 編輯 env.yaml，使用 GOOGLE_CREDENTIALS_BASE64

# 2. 部署到 Cloud Run
gcloud run deploy firestore-demo-api-v2 \
  --source . \
  --env-vars-file env.yaml \
  --region asia-east1 \
  --allow-unauthenticated
```

詳細部署教學請參閱：[部署文檔](docs/SETUP.md)

---

## 環境變數

主要環境變數（完整列表請參閱 [ENV_CONFIGURATION.md](docs/ENV_CONFIGURATION.md)）：

| 變數名稱 | 說明 | 預設值 |
|---------|------|-------|
| `PORT` | 伺服器埠號 | `8080` |
| `NODE_ENV` | 執行環境 | `development` |
| `FIREBASE_PROJECT_ID` | Firebase 專案 ID | - |
| `FIREBASE_WEB_API_KEY` | Firebase Web API Key | - |
| `GOOGLE_CREDENTIALS_PATH` | Service Account JSON 路徑 | - |
| `SMTP_USER` | SMTP 使用者名稱 | - |
| `SMTP_PASSWORD` | SMTP 密碼 | - |
| `DEFAULT_PAGE_LIMIT` | 預設分頁筆數 | `20` |
| `MAX_PAGE_LIMIT` | 最大分頁筆數 | `100` |

---

## 安全性

### 防護機制

- ✅ Firebase Authentication Token 驗證
- ✅ Role-based Access Control（RBAC）
- ✅ Custom Claims 支援多角色
- ✅ API Rate Limiting（防止濫用）
- ✅ DTO Validation（輸入驗證）
- ✅ Helmet.js（HTTP 安全標頭）
- ✅ CORS 配置
- ✅ Soft Delete（資料不永久刪除）

### 注意事項

**永遠不要提交到 Git 的檔案**：
- `.env` - 本地環境變數
- `env.yaml` - Cloud Run 環境變數
- `firebase-service-account.json` - Firebase 憑證
- `*-service-account.json` - 任何服務帳號憑證

這些檔案已加入 `.gitignore`。

---

## 常見問題

### Q: 如何新增會員或管理員？

**A:** 有兩種方式：

1. **新建帳號**：使用 `POST /api/admin/members` 或 `POST /api/admin/admins`
2. **賦予角色**：使用 `POST /api/admin/members/assign-role` 或 `POST /api/admin/admins/assign-role`

### Q: 如何讓一個帳號同時擁有會員和管理員角色？

**A:**
1. 先使用 `POST /api/admin/members` 建立會員
2. 再使用 `POST /api/admin/admins/assign-role` 賦予管理員角色
3. 該帳號的 Custom Claims 將為 `{member: true, admin: true}`

### Q: Firebase 憑證應該使用哪種方式？

**A:**
- **本地開發**：使用 `GOOGLE_CREDENTIALS_PATH`（推薦）
- **Cloud Run**：使用 `GOOGLE_CREDENTIALS_BASE64`

### Q: Gmail SMTP 驗證失敗怎麼辦？

**A:**
1. 確認已啟用兩步驟驗證
2. 產生應用程式密碼：https://myaccount.google.com/apppasswords
3. 使用應用程式密碼（16 位數），而非 Gmail 帳號密碼

### Q: 如何查看 API 日誌？

**A:**
- **開發環境**：終端機會顯示格式化的彩色日誌（pino-pretty）
- **生產環境**：JSON 格式日誌，可整合到 Cloud Logging

---

## 相關文檔

- [環境變數配置](docs/ENV_CONFIGURATION.md)
- [快速設置指南](docs/SETUP.md)
- [Firebase Console](https://console.firebase.google.com/)
- [NestJS 官方文檔](https://docs.nestjs.com/)

---

## 授權

MIT License

---

## 貢獻

歡迎提交 Issue 和 Pull Request！

---

**Built with ❤️ using NestJS + Firebase**
