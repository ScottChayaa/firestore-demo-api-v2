# Google Cloud Storage 圖片上傳功能使用指南

## 目錄

- [概述](#概述)
- [環境配置](#環境配置)
- [API 說明](#api-說明)
- [測試頁面使用](#測試頁面使用)
- [整合到應用程式](#整合到應用程式)
- [常見問題](#常見問題)

---

## 概述

本專案實現了基於 Google Cloud Storage (GCS) 的圖片上傳功能，使用 Signed URL 機制讓前端直接上傳檔案到 GCS，提供更好的效能和安全性。

### 核心特性

- ✅ **Signed URL 上傳**：前端直接上傳到 GCS，不經過後端伺服器
- ✅ **安全驗證**：檔案類型、大小、權限多重驗證
- ✅ **進度監控**：支援上傳進度即時顯示
- ✅ **CDN 加速**：使用 Firebase CDN 全球加速
- ✅ **檔案管理**：支援刪除、預覽等操作

### 技術架構

```
前端 → 後端 API (生成 Signed URL) → 前端直接上傳到 GCS → CDN 提供訪問
```

---

## 環境配置

### 1. GCS Bucket 設定

#### 建立 Storage Bucket

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇專案 → Storage
3. 點擊「開始使用」，建立預設 Bucket

預設 Bucket 名稱格式：`{project-id}.appspot.com`

#### 配置 CORS 規則

在 GCP Console 中設定 CORS，允許前端直接上傳：

```bash
# 建立 cors.json
cat > cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "PUT"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

# 套用 CORS 設定
gsutil cors set cors.json gs://YOUR_BUCKET_NAME
```

### 2. 環境變數設定

複製 `.env.example` 到 `.env` 並填寫以下變數：

```bash
# Google Cloud Storage Configuration
GCS_BUCKET_NAME=your-project.appspot.com
GCS_SIGNED_URL_EXPIRES_MINUTES=15
GCS_FILE_PATH_PREFIX=uploads
```

**參數說明**：

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `GCS_BUCKET_NAME` | GCS Bucket 名稱 | `{project-id}.appspot.com` |
| `GCS_SIGNED_URL_EXPIRES_MINUTES` | Signed URL 有效期限（分鐘） | `15` |
| `GCS_FILE_PATH_PREFIX` | 檔案路徑前綴 | `uploads` |

### 3. Firebase 權限設定

確保 Firebase Service Account 有 Storage 權限：

1. 前往 [GCP Console IAM](https://console.cloud.google.com/iam-admin/iam)
2. 找到 `firebase-adminsdk` 服務帳號
3. 確認有以下角色：
   - `Storage Object Admin`
   - `Storage Object Creator`

---

## API 說明

### 1. 生成上傳 URL

**Endpoint**: `POST /api/storage/generate-upload-url`

**權限**: 需要管理員認證（`@Roles('admin')`）

**Request Body**:

```json
{
  "fileName": "product-image.jpg",
  "contentType": "image/jpeg",
  "fileSize": 1048576,
  "category": "product"
}
```

**參數說明**：

- `fileName`: 檔案名稱（1-255 字元）
- `contentType`: MIME 類型（`image/jpeg`, `image/png`, `image/gif`, `image/webp`）
- `fileSize`: 檔案大小（bytes，最大 5MB）
- `category`: 分類（`product`, `member`, `order`）

**Response**:

```json
{
  "uploadUrl": "https://storage.googleapis.com/...",
  "filePath": "uploads/products/2026/01/a1b2c3d4-5678-90ab-cdef-1234567890ab-product-image.jpg",
  "cdnUrl": "https://storage.googleapis.com/your-bucket/uploads/...",
  "expiresAt": "2026-01-07T16:00:00Z"
}
```

**範例**（使用 curl）:

```bash
curl -X POST http://localhost:8080/api/storage/generate-upload-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "fileName": "test.jpg",
    "contentType": "image/jpeg",
    "fileSize": 102400,
    "category": "product"
  }'
```

### 2. 刪除檔案

**Endpoint**: `DELETE /api/storage/files`

**權限**: 需要管理員認證

**Request Body**:

```json
{
  "filePath": "uploads/products/2026/01/a1b2c3d4-5678-90ab-cdef-1234567890ab-product-image.jpg"
}
```

**Response**:

```json
{
  "message": "檔案已刪除",
  "filePath": "uploads/products/2026/01/..."
}
```

**範例**:

```bash
curl -X DELETE http://localhost:8080/api/storage/files \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "filePath": "uploads/products/2026/01/test.jpg"
  }'
```

---

## 測試頁面使用

### 訪問測試頁面

1. 啟動專案：`npm run start:dev`
2. 訪問：http://localhost:8080/upload-test.html

### 使用流程

#### 步驟 1：取得管理員 Token

使用 REST Client 或其他工具登入並取得 Admin Token：

```http
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your_password"
}
```

#### 步驟 2：貼上 Token

將取得的 `idToken` 貼到測試頁面的「管理員 Token」輸入框

#### 步驟 3：選擇圖片

點擊「選擇圖片」，選取符合條件的圖片：
- 格式：JPEG, PNG, GIF, WebP
- 大小：最大 5MB

#### 步驟 4：上傳圖片

點擊「上傳圖片」，系統會：
1. 顯示上傳進度條
2. 完成後顯示預覽圖
3. 提供 CDN URL（可複製使用）

#### 步驟 5：刪除圖片（可選）

點擊「刪除圖片」即可從 GCS 移除檔案

---

## 整合到應用程式

### 前端整合範例

#### 1. 取得 Signed URL

```javascript
async function getUploadUrl(file, adminToken) {
  const response = await fetch('http://localhost:8080/api/storage/generate-upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      category: 'product'
    })
  });

  if (!response.ok) {
    throw new Error('生成上傳 URL 失敗');
  }

  return await response.json();
}
```

#### 2. 上傳到 GCS（含進度監控）

```javascript
function uploadToGCS(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 監聽上傳進度
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve();
      } else {
        reject(new Error(`上傳失敗: HTTP ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('網路錯誤'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
```

#### 3. 完整上傳流程

```javascript
async function uploadImage(file, adminToken) {
  try {
    // 步驟 1: 取得 Signed URL
    const { uploadUrl, cdnUrl, filePath } = await getUploadUrl(file, adminToken);

    // 步驟 2: 上傳到 GCS
    await uploadToGCS(uploadUrl, file, (percent) => {
      console.log(`上傳進度: ${percent}%`);
    });

    // 步驟 3: 返回 CDN URL
    return { cdnUrl, filePath };
  } catch (error) {
    console.error('上傳失敗:', error);
    throw error;
  }
}

// 使用範例
const file = document.getElementById('fileInput').files[0];
const { cdnUrl, filePath } = await uploadImage(file, adminToken);
console.log('CDN URL:', cdnUrl);
```

#### 4. 刪除圖片

```javascript
async function deleteImage(filePath, adminToken) {
  const response = await fetch('http://localhost:8080/api/storage/files', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ filePath })
  });

  if (!response.ok) {
    throw new Error('刪除失敗');
  }

  return await response.json();
}
```

### 與產品功能整合

#### 建立產品時上傳圖片

```javascript
async function createProductWithImage(productData, imageFile, adminToken) {
  // 1. 上傳圖片
  const { cdnUrl } = await uploadImage(imageFile, adminToken);

  // 2. 建立產品（包含圖片 URL）
  const response = await fetch('http://localhost:8080/api/admin/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      ...productData,
      imageUrl: cdnUrl
    })
  });

  return await response.json();
}
```

---

## 常見問題

### 1. 上傳失敗：403 Forbidden

**原因**：CORS 設定不正確或 Bucket 權限不足

**解決方法**：
1. 檢查 CORS 設定（見「環境配置」章節）
2. 確認 Firebase Service Account 有 Storage 權限

### 2. Token 過期或無效

**錯誤訊息**：`401 Unauthorized`

**解決方法**：
1. 重新登入取得新的 Token
2. 確認 Token 是管理員權限

### 3. 檔案類型不支援

**錯誤訊息**：`不支援的檔案類型: application/...`

**解決方法**：
1. 確認檔案格式為 JPEG, PNG, GIF 或 WebP

### 4. 檔案大小超過限制

**錯誤訊息**：`檔案大小超過限制 (5MB)`

**解決方法**：
1. 壓縮圖片後再上傳

### 5. Signed URL 過期

**錯誤訊息**：上傳時出現 400/403 錯誤

**原因**：Signed URL 預設 15 分鐘有效期

**解決方法**：
1. 重新生成 Signed URL
2. 或調整 `GCS_SIGNED_URL_EXPIRES_MINUTES`（不建議過長）

### 6. 頁面刷新後圖片殘留在 GCS

**問題描述**：上傳測試時頁面刷新，導致 GCS 有孤立檔案

**暫時方案**：
1. 手動到 Firebase Console → Storage 刪除
2. 或使用 gsutil 工具批次清理

**長期方案**（可選）：
- 實作檔案使用追蹤機制
- 設定 GCS 生命週期規則自動清理未使用檔案

### 7. 成本考量

**Firebase Storage 免費額度**：
- 儲存：5 GB
- 下載：1 GB/天
- 上傳：20,000 次/天

**建議**：
- 設定 GCP 預算警報
- 定期清理測試檔案
- 考慮圖片壓縮降低儲存成本

---

## 檔案路徑結構

系統自動組織檔案路徑，格式為：

```
{prefix}/{category}/{year}/{month}/{uuid}-{fileName}
```

**範例**：

```
uploads/products/2026/01/a1b2c3d4-5678-90ab-cdef-1234567890ab-macbook-pro.jpg
uploads/members/2026/01/b2c3d4e5-6789-01bc-def1-234567890abc-avatar.png
uploads/orders/2026/01/c3d4e5f6-7890-12cd-ef12-345678901bcd-receipt.jpg
```

**優點**：
- 按時間組織，方便管理和清理
- UUID 避免檔名衝突
- 保留原始檔名（截斷過長）
- 支援未來多類別擴展

---

## 進階功能（未來擴展）

### 1. 多圖上傳

新增批次生成 Signed URLs 的 API：

```typescript
POST /api/storage/generate-upload-urls

Body: {
  "files": [
    { "fileName": "image1.jpg", "contentType": "image/jpeg", ... },
    { "fileName": "image2.png", "contentType": "image/png", ... }
  ]
}
```

### 2. 圖片處理

- **前端壓縮**：使用 `browser-image-compression` 套件
- **後端處理**：Cloud Functions 自動生成縮圖

### 3. 自動清理

設定 GCS 生命週期規則：

```json
{
  "lifecycle": {
    "rule": [{
      "action": {"type": "Delete"},
      "condition": {
        "age": 30,
        "matchesPrefix": ["uploads/temp/"]
      }
    }]
  }
}
```

---

## 相關文件

- [實現計劃](./STORAGE_IMPLEMENTATION_PLAN.md) - 詳細技術設計和實施步驟
- [環境變數配置](./ENV_CONFIGURATION.md) - 完整環境變數說明
- [專案 README](../README.md) - 專案整體說明

---

## 技術支援

如遇到問題，請檢查：
1. GCS Bucket CORS 設定
2. Firebase Service Account 權限
3. 環境變數配置
4. Token 有效性和權限

更多協助請參考 [Firebase Storage 文檔](https://firebase.google.com/docs/storage)。
