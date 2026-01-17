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




**疑問**
- thumbnailStatus?: ThumbnailStatus 縮圖處理狀態, 有欄位資訊, 但卻沒有實際使用?
  - 例如, 建立資料時先預設 pending? 開始處理時變 processing , 完成後變 completed...

- 避免無限迴圈： 處理完的縮圖是否有機制避免重複觸發 ?
- 4K 以上的大圖才需要用 512 MB, 一般情況 cloud function 使用 256MB 即可
- 為什麼 functions/ 要獨立出一個 npm src 結構?
  - 是否能合併在同一個 api-v2 專案底下?
  - 如果分離出去獨立成 firestore-demo-functions-v2/, 那這樣我就不能使用原專案的類型定義, 而且當 cloud function 完成工作後想要更新 firestore 裡面的資料, 又還要另外寫 repository, 變成要維護兩份相同邏輯的 repo, 感覺沒有達到程式碼共用的精神
- functions/eslintrc.js 目前不需要可以省略
- 目前我的想法是, 專案完成編譯後, 應該要能夠獨立部屬這個 functions


疑問
- functions/ 能不能改到 src/ 底下, 使用相同專案資源的 dto, entities..., 比如 functions/thumbnail/
  - 如果這樣是不是就可以使用 files repository 進行資料更新 
- 避免無限迴圈： 處理完的縮圖是否有機制避免重複觸發 ?
- functions/eslintrc.js 目前不需要可以省略


忽略剛剛的分析, 再次重新討論:

- 決定將 functions/ 獨立出一個專案專門處理 cloud functions: /home/ubuntu/wsl-workspace/firestore-demo-functions-v2
  - 原來 env 的 Thumbnail Configuration 也要搬出去
  - 縮圖完成後，透過一個內部的 API 請求傳回給 NestJS API進行 File 資料更新。


