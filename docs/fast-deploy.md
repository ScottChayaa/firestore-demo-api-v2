# 部屬相關資料

**gcloud 部屬設定**
```sh
gcloud config configurations create default               # 建立一個新的 gcloud 設定組態 (configuration)
gcloud config configurations list                         # 查看所有組態
gcloud config configurations activate default             # 切換設定: default
gcloud config set project liang-dev                       # 設定 gcloud CLI 的預設專案ID

gcloud config list                                        # 顯示目前設定

gcloud auth login                                         # 驗證 gcloud CLI 的使用者
gcloud auth configure-docker us-west1-docker.pkg.dev    # 設定 Docker 對 Google Artifact Registry 的登入憑證
```

**Deploy to Cloud Run**
```bash
# 登入並設定專案
gcloud auth login
gcloud config set project liang-dev

# 切換設定: default
gcloud config configurations activate default

# 建立映像
docker build -t us-west1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api-v2:0.0.1 .

# 推送映像到 Container Registry
gcloud auth configure-docker us-west1-docker.pkg.dev      # 設定 Docker 對 Google Artifact Registry 的登入憑證
docker push us-west1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api-v2:0.0.1

# 部署到 Cloud Run（包含完整環境變數）
gcloud run deploy firestore-demo-api-v2 \
  --image us-west1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api-v2:0.0.1 \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated \
  --env-vars-file env.liang-dev.yaml \
  --memory 512Mi \
  --max-instances 10 \
  --timeout 300 \
  --project liang-dev
```

**Deploy to Firestore**
```bash
# 登入 (⚠重要), 確認目前使用的專案
firebase login
firebase use liang-dev

# 部署 Rules 和 Indexes 到指定的專案ID
firebase deploy --only firestore:rules,firestore:indexes --project liang-dev

# 匯出 Firestore 索引至本機
firebase firestore:indexes --project liang-dev > firestore.indexes.json
```

**Check cloud run infomation**
```bash
# 查看服務資訊 (url, port, memory, cpu, env...)
gcloud run services describe firestore-demo-api --region=us-west1

# 查看服務的所有 revisions
gcloud run revisions list \
  --service firestore-demo-api \
  --region us-west1

# 查看當前生產版本（正在服務的版本）
gcloud run services describe firestore-demo-api \
  --region us-west1 \
  --format="value(status.latestReadyRevisionNsame)"

# 查看特定 revision 的詳細資訊
gcloud run revisions describe firestore-demo-api-00008-8t6 --region us-west1
```


**GCS cli**

```bash
# 建立 3 Bucket 架構
gcloud storage buckets create gs://firestore-demo-api-v2-temp --location=us-west1 --default-storage-class=standard
gcloud storage buckets create gs://firestore-demo-api-v2 --location=us-west1 --default-storage-class=standard
gcloud storage buckets create gs://firestore-demo-api-v2-eventarc --location=us-west1 --default-storage-class=standard

# 更新 cors
gcloud storage buckets update gs://firestore-demo-api-v2-temp --cors-file=gcs-cors.json
gcloud storage buckets update gs://firestore-demo-api-v2 --cors-file=gcs-cors.json
gcloud storage buckets update gs://firestore-demo-api-v2-eventarc --cors-file=gcs-cors.json

# 更新 lifecycle
#   temp bucket 的檔案會 1 天後自動刪除
gcloud storage buckets update gs://firestore-demo-api-v2-temp --lifecycle-file=gcs-lifecycle.json

# 確認 cors 設定資訊
gcloud storage buckets describe gs://firestore-demo-api-v2-temp --format="default(cors_config)"
gcloud storage buckets describe gs://firestore-demo-api-v2 --format="default(cors_config)"
gcloud storage buckets describe gs://firestore-demo-api-v2-eventarc --format="default(cors_config)"

# 將整個 Bucket 設為公開（適合圖片伺服器）
gcloud storage buckets add-iam-policy-binding gs://firestore-demo-api-v2-temp --member="allUsers" --role="roles/storage.objectViewer"
gcloud storage buckets add-iam-policy-binding gs://firestore-demo-api-v2 --member="allUsers" --role="roles/storage.objectViewer"
gcloud storage buckets add-iam-policy-binding gs://firestore-demo-api-v2-eventarc --member="allUsers" --role="roles/storage.objectViewer"

# 確認是否設定為公開 (檢查IAM)
gcloud storage buckets get-iam-policy gs://firestore-demo-api-v2-temp
```

