# 📋 NestJS 遷移計劃總覽

> **專案**：firestore-demo-api → firestore-demo-api-v2
> **框架**：Express → NestJS v10+
> **資料庫**：Firestore（共用同一個 database）
> **進度追蹤**：本目錄記錄所有階段的詳細任務

---

## 🎯 遷移目標

1. ✅ 使用 NestJS 最新版本框架
2. ✅ 保持與舊版 Firestore 的兼容性（共用 database）
3. ✅ 改進架構設計（Repository 模式）
4. ✅ 不實作 migration 功能
5. ✅ 支援 .env 和 env.yaml 配置
6. ✅ Docker image 名稱：firestore-demo-api-v2

---

## 📊 專案階段劃分

### 🔵 Phase 1 - 前期階段：基礎架構建立
> **文檔**：[PHASE-1-前期階段.md](./PHASE-1-前期階段.md)
> **任務數**：11 項
> **狀態**：⏳ 準備開始

**核心任務**：
1. 初始化 NestJS 專案
2. 配置環境變數（.env + env.yaml）
3. 建立 Firebase Admin SDK 模組
4. 設置 Logger 系統（Pino）
5. 實現 Guards（Auth、Role）
6. 實現 Exception Filter
7. 實現 HTTP Logger Interceptor
8. 配置安全設定（CORS、Helmet）
9. 建立 Docker 配置
10. 建立分頁工具
11. 創建健康檢查端點

**完成標準**：
- ✅ NestJS 專案能正常啟動
- ✅ Firebase Firestore 能正常連接
- ✅ 日誌系統運作正常
- ✅ Guards 能正確驗證 Token
- ✅ Docker image 能成功 build

**暫停點**：完成後需本機測試基礎功能

---

### 🟢 Phase 2 - 中期階段：核心業務模組遷移
> **文檔**：[PHASE-2-中期階段.md](./PHASE-2-中期階段.md)
> **任務數**：6 項
> **狀態**：⏸️ 等待 Phase 1 完成

**核心任務**：
1. 實現認證模組（註冊、登入、忘記密碼）
2. 實現商品模組（公開 API）
3. 實現會員模組（基礎 CRUD）
4. 實現軟刪除功能
5. 實現會員個人資料 API
6. 建立 DTO 和 Validation Pipes

**完成標準**：
- ✅ 會員可以成功註冊和登入
- ✅ 商品 API 能正常查詢
- ✅ 管理員能對會員進行 CRUD
- ✅ 軟刪除功能正常運作
- ✅ DTO 驗證正常運作

**暫停點**：完成後需測試認證、商品、會員功能

---

### 🟡 Phase 3 - 後期階段：高級功能與完善
> **文檔**：[PHASE-3-後期階段.md](./PHASE-3-後期階段.md)
> **任務數**：9 項
> **狀態**：⏸️ 等待 Phase 2 完成

**核心任務**：
1. 實現管理員模組
2. 實現訂單模組
3. 實現郵件服務模組
4. 實現 Rate Limiter
5. 遷移測試資料生成腳本
6. 遷移清理腳本
7. 建立 E2E 測試
8. 更新文檔
9. 建立 .env.example

**完成標準**：
- ✅ 所有模組功能完整
- ✅ 測試腳本正常運作
- ✅ E2E 測試通過
- ✅ 文檔完整

**暫停點**：完成後進行完整的端到端測試

---

## 📈 總體進度

| 階段 | 任務數 | 狀態 | 完成度 |
|------|--------|------|--------|
| Phase 1 - 前期階段 | 11 | ⏳ 準備開始 | 0% |
| Phase 2 - 中期階段 | 6 | ⏸️ 等待 | 0% |
| Phase 3 - 後期階段 | 9 | ⏸️ 等待 | 0% |
| **總計** | **26** | **進行中** | **0%** |

---

## 🏗️ 架構改進對比

### 舊版 Express 架構
```
routes/
  ├── auth.js
  ├── products.js
  ├── admin/
  └── member/

controllers/
  ├── authController.js
  ├── memberController.js
  ├── orderController.js
  └── productController.js

middleware/
  ├── auth.js
  ├── authMember.js
  ├── authAdmin.js
  └── validator.js

utils/
  └── firestore.js  (直接存取 Firestore)
```

### 新版 NestJS 架構
```
src/
  ├── auth/
  │   ├── auth.module.ts
  │   ├── auth.controller.ts
  │   ├── auth.service.ts
  │   └── dto/
  ├── members/
  │   ├── members.module.ts
  │   ├── members.controller.ts
  │   ├── members.service.ts
  │   ├── members.repository.ts  (Repository 模式)
  │   ├── entities/
  │   └── dto/
  ├── orders/
  ├── products/
  ├── admins/
  ├── common/
  │   ├── guards/  (取代 middleware)
  │   ├── filters/
  │   ├── interceptors/
  │   ├── decorators/
  │   └── pagination/
  └── firebase/
      └── firebase.module.ts  (集中管理)
```

**主要改進**：
1. ✅ **模組化**：每個功能獨立成模組
2. ✅ **分層架構**：Controller → Service → Repository
3. ✅ **依賴注入**：全面使用 DI 容器
4. ✅ **Repository 模式**：資料存取層分離
5. ✅ **Type Safety**：完整的 TypeScript 支援
6. ✅ **DTO 驗證**：使用 class-validator

---

## 🔄 Firestore 存取方式改進

### 舊版（直接使用 SDK）
```javascript
// controller 中直接操作 Firestore
const db = admin.firestore();
const doc = await db.collection('members').doc(id).get();
const data = doc.data();
```

### 新版（Repository 模式）
```typescript
// Repository 層
@Injectable()
export class MembersRepository {
  async findById(id: string): Promise<Member> {
    const doc = await this.firestore.collection('members').doc(id).get();
    return this.mapToEntity(doc);
  }
}

// Service 層
@Injectable()
export class MembersService {
  async getMember(id: string): Promise<Member> {
    return this.membersRepo.findById(id);
  }
}

// Controller 層
@Get(':id')
async getMember(@Param('id') id: string) {
  return this.membersService.getMember(id);
}
```

**優勢**：
- 易於測試（可 mock Repository）
- 關注點分離
- 可重用性高
- 易於維護

---

## 🛠️ 技術棧對比

| 項目 | 舊版 | 新版 |
|------|------|------|
| 框架 | Express | NestJS v10+ |
| 語言 | JavaScript | TypeScript |
| 驗證 | express-validator | class-validator |
| 日誌 | Pino | Pino (nestjs-pino) |
| 錯誤處理 | 自訂 middleware | Exception Filter |
| 認證 | 自訂 middleware | Guards |
| 測試 | Jest | Jest + Supertest |
| 文檔 | README | OpenAPI (可選) |

---

## ⚙️ Logger 方案決策

### 評估結果：使用 **Pino Logger**

**選擇理由**：
1. ✅ 舊專案已使用，遷移成本低
2. ✅ 極高效能（比 Winston 快 5-10 倍）
3. ✅ 結構化 JSON 輸出（生產環境友善）
4. ✅ NestJS 官方支援（nestjs-pino）
5. ✅ 易於整合監控系統

**實作方式**：
```typescript
// 使用 nestjs-pino
LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }  // 開發環境：彩色輸出
      : undefined,                  // 生產環境：JSON 輸出
  },
})
```

---

## 📝 重要注意事項

### 1. 資料庫遷移
- ❌ **不實作 migration 功能**（按照需求）
- ✅ 兩個版本共用同一個 Firestore database
- ✅ 確保資料結構完全兼容

### 2. Docker 配置
- 新版 image 名稱：`firestore-demo-api-v2`
- 使用相同的環境變數
- 相同的 Firestore database

### 3. 分階段測試
- ✅ Phase 1 完成後暫停測試
- ✅ Phase 2 完成後暫停測試
- ✅ Phase 3 完成後進行完整測試

### 4. Git Commit 規範
遵循 CLAUDE.md 規範：
- 使用中文 commit message
- 格式：`[類型] 簡短描述`
- 不包含 AI 生成標記

---

## 🧪 測試策略

### 單元測試
- Repository 層測試
- Service 層測試
- Utility 函數測試

### E2E 測試
- 認證流程測試
- API 端點測試
- 權限控制測試

### 手動測試
- 健康檢查
- Firebase 連接
- 分頁功能
- 軟刪除功能

---

## 📚 文檔結構

```
todolist/
├── README.md                    # 本文檔（總覽）
├── PHASE-1-前期階段.md          # Phase 1 詳細任務
├── PHASE-2-中期階段.md          # Phase 2 詳細任務
└── PHASE-3-後期階段.md          # Phase 3 詳細任務
```

---

## 🚀 快速開始

### 1. 查看當前階段
當前階段：**Phase 1 - 前期階段**

### 2. 閱讀詳細任務
```bash
cat todolist/PHASE-1-前期階段.md
```

### 3. 開始執行
按照 Phase 1 文檔中的任務順序執行

### 4. 追蹤進度
在主 todo list 中更新任務狀態

---

## 📞 聯絡資訊

如有問題，請參考：
- 舊專案文檔：`/mnt/d/MyDocument/Git/GitHub/firestore-demo-api/README.md`
- CLAUDE.md：`/mnt/d/MyDocument/Git/GitHub/firestore-demo-api-v2/CLAUDE.md`

---

**最後更新**：2025-12-30
**版本**：v1.0.0
