# 快速部屬

**gcloud 部屬設定**
```sh
gcloud config configurations create default               # 建立一個新的 gcloud 設定組態 (configuration)
gcloud config configurations list                         # 查看所有組態
gcloud config configurations activate default             # 切換設定: default
gcloud config set project liang-dev                       # 設定 gcloud CLI 的預設專案ID

gcloud config list                                        # 顯示目前設定

gcloud auth login                                         # 驗證 gcloud CLI 的使用者
gcloud auth configure-docker asia-east1-docker.pkg.dev    # 設定 Docker 對 Google Artifact Registry 的登入憑證
```

**Deploy to Cloud Run**
```bash
# 登入並設定專案
gcloud auth login
gcloud config set project liang-dev

# 切換設定: default
gcloud config configurations activate default

# 建立映像
docker build -t asia-east1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api-v2:0.0.1 .

# 推送映像到 Container Registry
gcloud auth configure-docker asia-east1-docker.pkg.dev      # 設定 Docker 對 Google Artifact Registry 的登入憑證
docker push asia-east1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api-v2:0.0.1

# 部署到 Cloud Run（包含完整環境變數）
gcloud run deploy firestore-demo-api-v2 \
  --image asia-east1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api-v2:0.0.1 \
  --platform managed \
  --region asia-east1 \
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
gcloud run services describe firestore-demo-api --region=asia-east1

# 查看服務的所有 revisions
gcloud run revisions list \
  --service firestore-demo-api \
  --region asia-east1

# 查看當前生產版本（正在服務的版本）
gcloud run services describe firestore-demo-api \
  --region asia-east1 \
  --format="value(status.latestReadyRevisionName)"

# 查看特定 revision 的詳細資訊
gcloud run revisions describe firestore-demo-api-00008-8t6 --region asia-east1
```