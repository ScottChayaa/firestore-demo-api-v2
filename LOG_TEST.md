# 📋 Logger 測試指南

## 🎯 Log 格式調整項目

### 1. ✅ 新增 "severity" 欄位（Cloud Log 需要）
- 對應關係：
  - `trace` / `debug` → `DEBUG`
  - `info` → `INFO`
  - `warn` → `WARNING`
  - `error` → `ERROR`
  - `fatal` → `CRITICAL`

### 2. ✅ "time" 格式改為 ISO8601
- 格式：`2025-12-30T19:21:22.650Z`

### 3. ✅ req.headers 欄位優化
- **保留**：
  - `user-agent`
  - `accept`
  - `x-request-id`（新增）
- **移除**：其他所有 headers

### 4. ✅ x-request-id 實現
- 優先使用前端傳遞的 `x-request-id`
- 若無則自動生成 UUID（`crypto.randomUUID()`）
- 同步設置響應頭 `X-Request-ID`
- 用於 Cloud Log 問題追蹤

### 5. ✅ "msg" 改為 "message"
- 使用 `messageKey: 'message'` 配置

### 6. ✅ "res" 只保留 statusCode
- 移除其他響應欄位

---

## 🧪 測試端點

### 1. GET / - 測試不同日誌級別
```bash
curl http://localhost:8080/api
```

**驗證項目**：
- trace, debug, info, warn 級別都正確輸出
- 每個 log 都有 `severity` 欄位
- 每個 log 都有 `time` 欄位（ISO8601 格式）
- 自動生成 `x-request-id`

---

### 2. POST /test/echo - 測試 POST 請求
```bash
curl -X POST http://localhost:8080/api/test/echo \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "age": 30}'
```

**驗證項目**：
- `req.method` = `POST`
- `req.headers` 只包含 `user-agent`, `accept`, `x-request-id`
- `res.statusCode` = 200
- 響應包含自動生成的 `requestId`

---

### 3. POST /test/echo - 測試自定義 x-request-id
```bash
curl -X POST http://localhost:8080/api/test/echo \
  -H "Content-Type: application/json" \
  -H "x-request-id: my-custom-request-id-12345" \
  -d '{"test": "data"}'
```

**驗證項目**：
- Log 中的 `req.headers['x-request-id']` = `my-custom-request-id-12345`
- 響應頭包含 `X-Request-ID: my-custom-request-id-12345`
- 響應 body 的 `requestId` = `my-custom-request-id-12345`

---

### 4. GET /test/users/:userId - 測試 URI params
```bash
curl http://localhost:8080/api/test/users/user123
```

**驗證項目**：
- `req.url` = `/api/test/users/user123`
- Log 包含 `userId: "user123"`
- `x-request-id` 自動生成

---

### 5. GET /test/users/:userId/orders/:orderId - 測試多個 params
```bash
curl http://localhost:8080/api/test/users/user456/orders/order789
```

**驗證項目**：
- `req.url` = `/api/test/users/user456/orders/order789`
- Log 包含 `userId: "user456"`, `orderId: "order789"`
- `x-request-id` 自動生成

---

### 6. GET /test/error/400 - 測試 400 錯誤
```bash
curl http://localhost:8080/api/test/error/400
```

**驗證項目**：
- HTTP status = 500（未捕獲的錯誤）
- Log `severity` = `ERROR`
- Log 包含錯誤訊息

---

### 7. GET /test/error/500 - 測試 500 錯誤
```bash
curl http://localhost:8080/api/test/error/500
```

**驗證項目**：
- HTTP status = 500
- Log `severity` = `ERROR`
- Log 包含錯誤訊息

---

## 🔍 Log 格式範例

### 開發環境（pino-pretty）
```
[2025-12-30 19:21:22.650 +0800] INFO (12345): GET /api
    severity: "INFO"
    time: "2025-12-30T11:21:22.650Z"
    req: {
      method: "GET",
      url: "/api",
      headers: {
        user-agent: "curl/7.68.0",
        accept: "*/*",
        x-request-id: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
      }
    }
    res: {
      statusCode: 200
    }
    responseTime: 15
```

### 生產環境（JSON）
```json
{
  "severity": "INFO",
  "time": "2025-12-30T11:21:22.650Z",
  "message": "request completed",
  "req": {
    "method": "GET",
    "url": "/api",
    "headers": {
      "user-agent": "curl/7.68.0",
      "accept": "*/*",
      "x-request-id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
    }
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 15
}
```

---

## 📝 注意事項

1. **開發環境**：
   - 設置 `NODE_ENV=development`
   - Log 會使用 `pino-pretty` 格式化
   - 彩色輸出，便於閱讀

2. **生產環境**：
   - 設置 `NODE_ENV=production`
   - Log 輸出純 JSON 格式
   - 適合 Cloud Logging 收集

3. **x-request-id 追蹤**：
   - 可在 Cloud Logging 中使用此 ID 過濾所有相關日誌
   - 便於追蹤單一請求的完整生命週期

4. **用戶信息**：
   - 如果請求包含已認證用戶（`req.user`），會自動添加 `user.uid` 和 `user.email` 到日誌中
