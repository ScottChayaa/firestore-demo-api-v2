# GCS 圖片上傳功能實現計劃

## 概述

實現基於 Google Cloud Storage 的圖片上傳功能，使用 Signed URL 讓前端直接上傳到 GCS，並提供簡單的 HTML 測試頁面進行驗證。

## 核心功能

- ✅ 後端生成 Signed URL API
- ✅ 前端直接上傳到 GCS（使用 Signed URL）
- ✅ 圖片預覽與 CDN URL 顯示
- ✅ 圖片刪除功能（前端 + GCS）
- ✅ 上傳進度條顯示
- ✅ 簡單的 token 認證機制
- ✅ API 設計預留多圖上傳擴展性

## 技術架構

### 後端設計

**模組化架構**：建立獨立的 `storage` 模組，遵循專案現有的分層架構模式

```
src/storage/
├── storage.module.ts              # Storage 模組
├── storage.service.ts             # 核心服務（Signed URL、檔案管理）
├── controllers/
│   └── storage.controller.ts      # 上傳 API
└── dto/
    ├── generate-upload-url.dto.ts # 生成上傳 URL 請求
    └── delete-file.dto.ts         # 刪除檔案請求
```

**依賴套件**：無需額外安裝
- `@google-cloud/storage@7.18.0` - 已包含在 firebase-admin 中
- `multer` - 已包含在 @nestjs/platform-express 中

### CDN 方案

使用 **Firebase CDN（預設）**：
- URL 格式：`https://storage.googleapis.com/{bucket}/{path}`
- 零配置，自動 HTTPS，全球 CDN 加速
- 滿足基本需求，無需額外設定 Cloud CDN

### 檔案路徑組織

**路徑格式**：`{prefix}/{category}/{year}/{month}/{uuid}-{fileName}`

**範例**：
```
uploads/products/2026/01/a1b2c3d4-5678-90ab-cdef-1234567890ab-macbook.jpg
uploads/members/2026/01/b2c3d4e5-6789-01bc-def1-234567890abc-avatar.png
```

**優點**：
- 按時間組織，方便管理
- UUID 避免檔名衝突
- 支援未來多類別擴展（products、members、orders）

---

## API 設計

### 1. 生成上傳 URL

**Endpoint**: `POST /api/storage/generate-upload-url`

**權限**: 管理員（`@Roles('admin')`）

**Request**:
```json
{
  "fileName": "product-image.jpg",
  "contentType": "image/jpeg",
  "fileSize": 1048576,
  "category": "product"
}
```

**Response**:
```json
{
  "uploadUrl": "https://storage.googleapis.com/...",
  "filePath": "uploads/products/2026/01/uuid-product-image.jpg",
  "cdnUrl": "https://storage.googleapis.com/{bucket}/uploads/...",
  "expiresAt": "2026-01-07T16:00:00Z"
}
```

**驗證邏輯**:
- 檔案類型白名單：`image/jpeg`, `image/png`, `image/gif`, `image/webp`
- 檔案大小限制：5MB
- Signed URL 有效期：15 分鐘

### 2. 刪除檔案

**Endpoint**: `DELETE /api/storage/files`

**權限**: 管理員

**Request**:
```json
{
  "filePath": "uploads/products/2026/01/uuid-product-image.jpg"
}
```

**Response**:
```json
{
  "message": "檔案已刪除",
  "filePath": "uploads/products/2026/01/uuid-product-image.jpg"
}
```

---

## 前端測試頁面設計

### 頁面位置

`/home/ubuntu/wsl-workspace/firestore-demo-api-v2/public/upload-test.html`

訪問路徑：`http://localhost:8080/upload-test.html`

### UI 元素（簡化設計）

1. **Token 輸入區**
   - 輸入框：貼上管理員 Firebase Auth token
   - 說明：如何獲取 token（透過其他工具或 REST Client）

2. **圖片上傳區**
   - 檔案選擇器（`accept="image/*"`，單檔）
   - 上傳按鈕
   - 進度條（0-100%）

3. **預覽區**
   - 圖片縮圖預覽（使用 CDN URL）
   - CDN URL 顯示（可複製）
   - 刪除按鈕

4. **狀態提示**
   - 上傳中 / 成功 / 失敗狀態

### 上傳流程

1. 用戶貼上 admin token
2. 選擇圖片檔案（前端檔案驗證）
3. 點擊上傳
4. 前端請求 `POST /api/storage/generate-upload-url` 取得 Signed URL
5. 使用 Signed URL 直接 PUT 到 GCS（監聽上傳進度）
6. 成功後顯示 CDN URL 和預覽圖
7. 點擊刪除時呼叫 `DELETE /api/storage/files`

### 進度監聽實現

```javascript
// 使用 XMLHttpRequest 監聽上傳進度
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener('progress', (e) => {
  const percent = (e.loaded / e.total) * 100;
  updateProgressBar(percent);
});
xhr.open('PUT', uploadUrl);
xhr.setRequestHeader('Content-Type', file.type);
xhr.send(file);
```

---

## 環境變數配置

### 新增環境變數

`.env.example` 新增：
```bash
# ==========================================
# Google Cloud Storage Configuration
# ==========================================
# GCS Bucket 名稱（預設為 Firebase Storage Bucket）
GCS_BUCKET_NAME=

# Signed URL 有效期限（分鐘）
GCS_SIGNED_URL_EXPIRES_MINUTES=15

# 允許的檔案類型（MIME types，逗號分隔）
GCS_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp

# 最大檔案大小（MB）
GCS_MAX_FILE_SIZE_MB=5

# 檔案路徑前綴
GCS_FILE_PATH_PREFIX=uploads
```

### 配置解析

修改 `src/config/configuration.ts`，新增：
```typescript
// Google Cloud Storage Configuration
storage: {
  bucketName: config.GCS_BUCKET_NAME || `${config.FIREBASE_PROJECT_ID}.appspot.com`,
  signedUrlExpiresMinutes: parseInt(config.GCS_SIGNED_URL_EXPIRES_MINUTES, 10) || 15,
  allowedFileTypes: config.GCS_ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  maxFileSizeMB: parseInt(config.GCS_MAX_FILE_SIZE_MB, 10) || 5,
  filePathPrefix: config.GCS_FILE_PATH_PREFIX || 'uploads',
},
```

---

## 核心程式碼實現重點

### 1. Firebase Storage Provider

修改 `/src/firebase/firebase.module.ts`，新增：
```typescript
{
  provide: 'STORAGE',
  useFactory: (app: admin.app.App | null) => {
    if (!app) return null;
    return app.storage().bucket();
  },
  inject: ['FIREBASE_APP'],
}
```

### 2. StorageService 核心方法

**generateUploadUrl**:
- 驗證檔案類型和大小
- 生成檔案路徑（含 UUID）
- 生成 Signed URL（15 分鐘有效期）
- 返回 uploadUrl、filePath、cdnUrl

**deleteFile**:
- 檢查檔案是否存在
- 刪除 GCS 檔案
- 記錄日誌

**generateFilePath**:
- 組合路徑：`{prefix}/{category}/{year}/{month}/{uuid}-{sanitizedFileName}`
- 清理檔案名（移除特殊字元）

### 3. StorageController

**權限控制**:
- `@UseGuards(FirebaseAuthGuard, RolesGuard)`
- `@Roles('admin')`

**日誌記錄**:
- 使用 PinoLogger 記錄所有操作

---

## 需要創建/修改的檔案

### 新建檔案（8 個）

1. `/src/storage/storage.module.ts` - Storage 模組定義
2. `/src/storage/storage.service.ts` - 核心服務實現
3. `/src/storage/controllers/storage.controller.ts` - API Controller
4. `/src/storage/dto/generate-upload-url.dto.ts` - 生成上傳 URL DTO
5. `/src/storage/dto/delete-file.dto.ts` - 刪除檔案 DTO
6. `/public/upload-test.html` - 測試頁面（簡化設計）
7. `/rests/storage.rest` - REST Client 測試檔案
8. `/docs/STORAGE_GUIDE.md` - Storage 功能使用文檔

### 修改檔案（5 個）

9. `/src/firebase/firebase.module.ts` - 新增 STORAGE Provider
10. `/src/app.module.ts` - 匯入 StorageModule
11. `/src/main.ts` - 配置靜態檔案服務（`app.useStaticAssets`）
12. `/src/config/configuration.ts` - 新增 storage 配置
13. `.env.example` - 新增 GCS 環境變數
14. `README.md` - 更新功能說明（可選）

---

## 實施順序

### Phase 1：環境配置（優先）
1. 修改 `.env.example` 新增 GCS 環境變數
2. 修改 `src/config/configuration.ts` 新增 storage 配置
3. 修改 `src/firebase/firebase.module.ts` 新增 STORAGE Provider

### Phase 2：後端 API
4. 建立 Storage 模組結構（module、service、controller、dto）
5. 實現 StorageService 核心邏輯
6. 實現 StorageController API endpoints
7. 修改 `src/app.module.ts` 匯入 StorageModule

### Phase 3：前端測試頁面
8. 修改 `src/main.ts` 配置靜態檔案服務
9. 建立 `public/upload-test.html`（簡化設計，專注核心功能）
   - Token 輸入區
   - 單圖上傳（含進度條）
   - 預覽與刪除

### Phase 4：測試與文檔
10. 建立 `rests/storage.rest` REST Client 測試
11. 整合測試（後端 API + 前端頁面）
12. 撰寫 `docs/STORAGE_GUIDE.md` 使用文檔
13. 更新 `README.md`（可選）

---

## 擴展性預留

### 未來可擴展功能

1. **多圖上傳**：
   - 新增 API endpoint：`POST /api/storage/generate-upload-urls`（複數）
   - 接受陣列參數，批次生成多個 Signed URLs

2. **圖片處理**：
   - 前端壓縮：使用 `browser-image-compression`
   - 後端處理：使用 Cloud Functions 或 `sharp` 套件

3. **自動清理**：
   - GCS 生命週期規則：30 天自動刪除未使用檔案
   - 產品刪除時自動清理關聯圖片

4. **進階安全**：
   - 圖片內容掃描（惡意軟體）
   - 浮水印功能
   - 訪問日誌審計

---

## 安全性考量

### 已實作

- ✅ Signed URL 限時有效（15 分鐘）
- ✅ 檔案類型白名單驗證
- ✅ 檔案大小限制（5MB）
- ✅ 管理員權限控制
- ✅ 檔案路徑清理（防止路徑遍歷）

### GCS CORS 配置

需在 GCP Console 設定 Bucket CORS：
```json
[
  {
    "origin": ["*"],
    "method": ["GET", "PUT"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

---

## 成本預估

### Firebase Storage 免費額度

- 儲存：5 GB
- 下載：1 GB/天
- 上傳：20,000 次/天

### 超量計費（參考）

- 儲存：$0.026/GB/月
- 下載：$0.12/GB
- 上傳操作：$0.05/10,000 次

**建議**：設定 GCP 預算警報

---

## 已知限制與暫不處理

### 頁面刷新殘留問題

**問題描述**：
- 用戶上傳圖片後，頁面刷新前未保存到產品資料
- GCS 上會有孤立檔案（未被任何產品引用）

**現階段方案**：
- 暫時不處理（符合用戶需求）
- 手動清理或使用 GCS 生命週期規則

**長期方案（可選）**：
- 實作檔案使用追蹤機制（建立 storage_files collection）
- 定期掃描未關聯檔案
- 自動清理超過 N 天的孤立檔案

---

## 關鍵文件清單

實現此功能最關鍵的 5 個檔案：

1. **`/src/storage/storage.service.ts`** - 核心邏輯：Signed URL 生成、檔案路徑管理、檔案驗證與刪除
2. **`/src/storage/controllers/storage.controller.ts`** - API 端點：上傳 URL 生成、檔案刪除接口
3. **`/src/firebase/firebase.module.ts`** - Storage Provider 初始化：整合 GCS Bucket 到 DI 系統
4. **`/public/upload-test.html`** - 測試頁面：完整上傳流程 UI（token 輸入、選擇、上傳、進度、預覽、刪除）
5. **`/src/config/configuration.ts`** - 配置管理：GCS 相關環境變數解析與預設值設定

---

## 總結

此計劃遵循專案現有的模組化架構、分層設計、DTO 驗證模式，整合 Firebase Admin SDK，提供簡化的測試頁面（專注核心功能），並預留未來擴展性。實施順序由基礎架構到後端 API，最後完成前端測試頁面，確保每個階段都可獨立驗證。
