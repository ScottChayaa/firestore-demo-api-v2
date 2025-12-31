## 📚 Git 工作流程

### Commit 規範

當需要修改或創建程式碼時：

1. 先檢查當前 Git 狀態
2. 創建有意義的 commit message（使用中文或英文）
3. Commit message 格式：`類型: 簡短描述`

**類型範例**：
- `feat`：新功能
- `fix`：錯誤修復
- `refactor`：程式碼重構
- `docs`：文件更新
- `test`：測試相關
- `chore`：建置工具、依賴更新等

**範例**：
```bash
git commit -m "feat: 新增會員軟刪除功能"
git commit -m "fix: 修正訂單查詢分頁錯誤"
git commit -m "docs: 更新 API 文件"
```

**重要提醒**：
- ✅ 每次完成任務後，必須主動幫用戶建立 git commit
- ❌ Commit message 中**不要**包含 "Generated with Claude Code" 或 "Co-Authored-By: Claude" 等 AI 生成標記
- ✅ 使用簡潔清晰的中文 commit message


## 📁 專案結構規範

### 1. 檔案位置規範

**測試腳本和工具**：
- ✅ 所有測試腳本放在 `scripts/` 目錄下
- ✅ 文檔放在專案根目錄（如 `README.md`, `SETUP.md`, `LOG_TEST.md`）
- ❌ 不要將測試腳本（`.sh`, `.js` 等）直接放在根目錄

**目錄結構**：
```
firestore-demo-api-v2/
├── scripts/           # 測試腳本、工具腳本
│   ├── test-log.sh
│   └── ...
├── src/               # 原始碼
├── todolist/          # 任務規劃文檔
├── README.md          # 專案說明
├── SETUP.md           # 快速設置指南
└── ...
```

---

## 🔐 安全性考量

### 1. 環境變數保護

**永不提交的敏感檔案**（已加入 .gitignore）：
```
.env
env.yaml
firebase-service-account.json
*-service-account.json
```