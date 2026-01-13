後續步驟

  1. 安裝 Firebase CLI 並登入

  npm install -g firebase-tools
  firebase login

  2. 設定 Firebase 專案 ID

  修改 .firebaserc 將 your-firebase-project-id 替換為實際的專案 ID：

  {
    "projects": {
      "default": "your-actual-project-id"
    }
  }

  3. 安裝 Cloud Function 依賴

  cd functions
  npm install
  cd ..

  4. 部署 Cloud Function

  # 建置
  cd functions
  npm run build

  # 部署
  cd ..
  firebase deploy --only functions

  5. 設定環境變數（選用）

  如需修改預設設定，可透過 Firebase CLI 設定：

  firebase functions:config:set \
    thumb.small.format="jpeg" \
    thumb.medium.format="webp" \
    gcs.bucket.name="your-bucket-name"

  6. 測試縮圖功能

  1. 使用現有的 REST Client 上傳圖片
  2. 等待 10-30 秒讓 Cloud Function 執行
  3. 查詢檔案 API，確認 thumbnails 欄位已填充
  4. 驗證縮圖 URL 可正常訪問

  7. 查看 Cloud Function 日誌

  firebase functions:log --only generateImageThumbnails

