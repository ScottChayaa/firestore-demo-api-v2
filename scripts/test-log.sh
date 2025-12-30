#!/bin/bash

# Log 測試腳本
# 使用方法：
#   1. 先啟動服務：npm run start:dev
#   2. 執行此腳本：./scripts/test-log.sh

BASE_URL="http://localhost:8080/api"

echo "=================================="
echo "🧪 Logger 功能測試"
echo "=================================="
echo ""

echo "📌 測試 1: GET / - 測試不同日誌級別"
curl -s $BASE_URL | jq
echo ""
echo "-----------------------------------"
echo ""

echo "📌 測試 2: POST /test/echo - 測試 POST 請求（自動生成 request ID）"
curl -s -X POST $BASE_URL/test/echo \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "age": 30}' | jq
echo ""
echo "-----------------------------------"
echo ""

echo "📌 測試 3: POST /test/echo - 測試自定義 x-request-id"
curl -s -X POST $BASE_URL/test/echo \
  -H "Content-Type: application/json" \
  -H "x-request-id: my-custom-request-id-12345" \
  -d '{"test": "data"}' -v 2>&1 | grep -E "(x-request-id|X-Request-ID|requestId)"
echo ""
echo "-----------------------------------"
echo ""

echo "📌 測試 4: GET /test/users/:userId - 測試 URI params"
curl -s $BASE_URL/test/users/user123 | jq
echo ""
echo "-----------------------------------"
echo ""

echo "📌 測試 5: GET /test/users/:userId/orders/:orderId - 測試多個 params"
curl -s $BASE_URL/test/users/user456/orders/order789 | jq
echo ""
echo "-----------------------------------"
echo ""

echo "📌 測試 6: GET /test/error/400 - 測試錯誤處理"
curl -s $BASE_URL/test/error/400 | jq
echo ""
echo "-----------------------------------"
echo ""

echo "📌 測試 7: GET /health - 健康檢查"
curl -s $BASE_URL/health | jq
echo ""

echo "=================================="
echo "✅ 測試完成！請檢查終端的 log 輸出"
echo "=================================="
echo ""
echo "驗證項目："
echo "  ✓ 每個 log 包含 'severity' 欄位"
echo "  ✓ 每個 log 包含 'time' 欄位（ISO8601 格式）"
echo "  ✓ req.headers 只包含 user-agent, accept, x-request-id"
echo "  ✓ msg 顯示為 'message'"
echo "  ✓ res 只包含 statusCode"
echo "  ✓ x-request-id 正確生成和傳遞"
echo ""
