# Google 第三方登入實作文件

## 功能需求

實作 Google 第三方登入功能，讓會員和管理員可以透過 Google 帳號登入系統。

### 流程設計

#### 會員 Google 登入流程

```
1. 前端使用 Firebase SDK 進行 Google 登入 (signInWithPopup)
   ↓
2. 獲得 idToken 和 refreshToken
   ↓
3. 調用 POST /api/auth/member/signInWithGoogle { idToken, refreshToken }
   ↓
4. 後端驗證 idToken
   ↓
5. 檢查該 UID 是否存在於 members collection
   ├─ 不存在 → 建立新會員記錄 + 設定 Custom Claims (member: true)
   └─ 已存在 → 檢查並設定 Custom Claims
   ↓
6. 使用 Firebase REST API 刷新 token（獲取包含 custom claims 的新 token）
   ↓
7. 返回 { idToken, refreshToken, expiresIn, uid, message }
```

#### 管理員 Google 登入流程

```
1. 前端使用 Firebase SDK 進行 Google 登入 (signInWithPopup)
   ↓
2. 獲得 idToken 和 refreshToken
   ↓
3. 調用 POST /api/auth/admin/signInWithGoogle { idToken, refreshToken }
   ↓
4. 後端驗證 idToken
   ↓
5. 檢查該 UID 是否存在於 admins collection
   ├─ 不存在 → 建立新管理員記錄 + 設定 Custom Claims (admin: true)
   └─ 已存在 → 檢查並設定 Custom Claims
   ↓
6. 使用 Firebase REST API 刷新 token（獲取包含 custom claims 的新 token）
   ↓
7. 返回 { idToken, refreshToken, expiresIn, uid, message }
```

## 實作步驟

### 1. 建立 DTO

**檔案**: `src/auth/dto/google-sign-in.dto.ts`

```typescript
import { IsString } from 'class-validator';

export class GoogleSignInDto {
  @IsString({ message: 'ID Token 必須是字串' })
  idToken: string;

  @IsString({ message: 'Refresh Token 必須是字串' })
  refreshToken: string;
}
```

### 2. 在 AuthService 新增 signInWithGoogle 方法

**檔案**: `src/auth/auth.service.ts`

在 AuthService 中新增以下方法：

```typescript
/**
 * Google 第三方登入
 * 1. 驗證 Google idToken
 * 2. 檢查會員是否存在，不存在則建立
 * 3. 設定 Custom Claims（member 角色）
 * 4. 刷新 token 並返回
 */
async signInWithGoogle(dto: GoogleSignInDto) {
  try {
    // 1. 驗證 idToken
    const decodedToken = await this.firebaseApp.auth().verifyIdToken(dto.idToken);

    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const name = decodedToken.name || email?.split('@')[0];

    // 2. 檢查會員是否已存在於 Firestore
    const memberDoc = await this.firestore
      .collection('members')
      .doc(uid)
      .get();

    if (!memberDoc.exists) {
      // 第一次使用 Google 登入，建立會員記錄
      await this.firestore
        .collection('members')
        .doc(uid)
        .set({
          email,
          name,
          phone: null,
          isActive: true,
          deletedAt: null,
          deletedBy: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      this.logger.info({ uid, email }, '新會員透過 Google 登入註冊');
    }

    // 3. 確保 Custom Claims 已設定（避免重複登入時遺失）
    if (!decodedToken.member) {
      await this.firebaseApp.auth().setCustomUserClaims(uid, {
        member: true,
      });

      this.logger.info({ uid }, '設定會員 Custom Claims');
    }

    // 4. 當設定了新的 custom claims 時，需要刷新 token
    // 使用 refreshToken 通過 Firebase REST API 獲取包含新 claims 的 idToken
    if (!decodedToken.member || !memberDoc.exists) {
      // 需要刷新 token（新會員或缺少 custom claims）
      const tokenResponse = await axios.post(
        `https://securetoken.googleapis.com/v1/token?key=${this.webApiKey}`,
        {
          grant_type: 'refresh_token',
          refresh_token: dto.refreshToken,
        },
      );

      return {
        idToken: tokenResponse.data.id_token,
        refreshToken: tokenResponse.data.refresh_token,
        expiresIn: tokenResponse.data.expires_in,
        uid,
        message: memberDoc.exists ? '登入成功' : '註冊並登入成功',
      };
    }

    // 已存在的會員且已有 custom claims，直接返回原 token
    return {
      idToken: dto.idToken,
      refreshToken: dto.refreshToken,
      expiresIn: '3600',
      uid,
      message: '登入成功',
    };
  } catch (error) {
    this.logger.error({ error: error.message }, 'Google 登入失敗');

    if (error.code === 'auth/id-token-expired') {
      throw new UnauthorizedException('登入已過期，請重新登入');
    }
    if (error.code === 'auth/argument-error') {
      throw new BadRequestException('無效的 ID Token');
    }

    throw new UnauthorizedException('Google 登入失敗');
  }
}
```

**Token 刷新機制**：

採用**方案 A**：前端提供 refreshToken
- 前端在調用 signInWithGoogle API 時，同時傳遞 idToken 和 refreshToken
- 後端使用 refreshToken 通過 Firebase REST API 獲取新的 idToken
- 優點：可以立即返回包含 custom claims 的 token，用戶可以立即使用需要 member 權限的 API

### 3. 在 AuthController 新增會員端點

**檔案**: `src/auth/auth.controller.ts`

```typescript
/**
 * 會員 Google 第三方登入
 * POST /api/auth/member/signInWithGoogle
 */
@Public()
@Post('member/signInWithGoogle')
async memberSignInWithGoogle(@Body() dto: GoogleSignInDto) {
  this.logger.info('會員 Google 第三方登入請求');
  const result = await this.authService.signInWithGoogle(dto);
  this.logger.info({ uid: result.uid }, '會員 Google 登入成功');
  return result;
}
```

### 4. 管理員 Google 登入實作

#### 4.1 在 AuthService 新增 adminSignInWithGoogle 方法

**檔案**: `src/auth/auth.service.ts`

```typescript
/**
 * 管理員 Google 第三方登入
 * 1. 驗證 Google idToken
 * 2. 檢查管理員是否存在，不存在則建立
 * 3. 設定 Custom Claims（admin 角色）
 * 4. 刷新 token 並返回
 */
async adminSignInWithGoogle(dto: GoogleSignInDto) {
  try {
    // 1. 驗證 idToken
    const decodedToken = await this.firebaseApp.auth().verifyIdToken(dto.idToken);

    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const name = decodedToken.name || email?.split('@')[0];

    // 2. 檢查管理員是否已存在於 Firestore
    const adminDoc = await this.firestore
      .collection('admins')
      .doc(uid)
      .get();

    if (!adminDoc.exists) {
      // 第一次使用 Google 登入，建立管理員記錄
      await this.firestore
        .collection('admins')
        .doc(uid)
        .set({
          email,
          name,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      this.logger.info({ uid, email }, '新管理員透過 Google 登入註冊');
    }

    // 3. 確保 Custom Claims 已設定（避免重複登入時遺失）
    if (!decodedToken.admin) {
      await this.firebaseApp.auth().setCustomUserClaims(uid, {
        admin: true,
      });

      this.logger.info({ uid }, '設定管理員 Custom Claims');
    }

    // 4. 當設定了新的 custom claims 時，需要刷新 token
    if (!decodedToken.admin || !adminDoc.exists) {
      // 需要刷新 token（新管理員或缺少 custom claims）
      const tokenResponse = await axios.post(
        `https://securetoken.googleapis.com/v1/token?key=${this.webApiKey}`,
        {
          grant_type: 'refresh_token',
          refresh_token: dto.refreshToken,
        },
      );

      return {
        idToken: tokenResponse.data.id_token,
        refreshToken: tokenResponse.data.refresh_token,
        expiresIn: tokenResponse.data.expires_in,
        uid,
        message: adminDoc.exists ? '登入成功' : '註冊並登入成功',
      };
    }

    // 已存在的管理員且已有 custom claims，直接返回原 token
    return {
      idToken: dto.idToken,
      refreshToken: dto.refreshToken,
      expiresIn: '3600',
      uid,
      message: '登入成功',
    };
  } catch (error) {
    this.logger.error({ error: error.message }, '管理員 Google 登入失敗');

    if (error.code === 'auth/id-token-expired') {
      throw new UnauthorizedException('登入已過期，請重新登入');
    }
    if (error.code === 'auth/argument-error') {
      throw new BadRequestException('無效的 ID Token');
    }

    throw new UnauthorizedException('管理員 Google 登入失敗');
  }
}
```

#### 4.2 在 AuthController 新增管理員端點

**檔案**: `src/auth/auth.controller.ts`

```typescript
/**
 * 管理員 Google 第三方登入
 * POST /api/auth/admin/signInWithGoogle
 */
@Public()
@Post('admin/signInWithGoogle')
async adminSignInWithGoogle(@Body() googleSignInDto: GoogleSignInDto) {
  this.logger.info('管理員 Google 第三方登入請求');
  const result = await this.authService.adminSignInWithGoogle(googleSignInDto);
  this.logger.info({ uid: result.uid }, '管理員 Google 登入成功');
  return result;
}
```

### 5. 更新測試頁面

**檔案**: `public/google-auth-test.html`

需要修改前端測試頁面，讓它在調用後端 API 時同時傳遞 idToken 和 refreshToken：

```javascript
// 儲存 refreshToken
let currentRefreshToken = null;

// Google 登入
window.signInWithGoogle = async function() {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  const idToken = await user.getIdToken();
  const refreshToken = user.refreshToken; // 獲取 refreshToken

  currentIdToken = idToken;
  currentRefreshToken = refreshToken; // 儲存 refreshToken
};

// 驗證 Token 並建立會員
window.verifyWithBackend = async function() {
  if (!currentIdToken || !currentRefreshToken) {
    showStatus('請先使用 Google 登入', 'error');
    return;
  }

  const response = await fetch(`${apiEndpoint}/auth/member/signInWithGoogle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idToken: currentIdToken,
      refreshToken: currentRefreshToken
    })
  });

  // ... 其他處理
};
```

## 關鍵檔案清單

- ✅ `src/auth/dto/google-sign-in.dto.ts` (新增)
- ✅ `src/auth/auth.service.ts` (修改，新增 signInWithGoogle 方法)
- ✅ `src/auth/auth.controller.ts` (修改，新增端點)
- ✅ `public/google-auth-test.html` (修改，傳遞 refreshToken)

## 測試驗證

### 測試步驟

1. **啟動伺服器**
   ```bash
   npm run start:dev
   ```

2. **開啟測試頁面**
   - 瀏覽器訪問 `http://localhost:8080/google-auth-test.html`
   - 填寫 Firebase API Key 和 Project ID

3. **測試 Google 登入**
   - 點擊「使用 Google 登入」按鈕
   - 完成 Google 授權
   - 確認顯示用戶資訊

4. **測試後端驗證**
   - 點擊「驗證並建立會員」按鈕
   - 確認後端返回成功訊息和新的 token

5. **驗證會員資料**
   - 使用返回的 idToken 調用 `GET /api/member` API
   - 確認可以取得會員資料

6. **測試重複登入**
   - 登出後再次使用 Google 登入
   - 確認不會重複建立會員記錄

### 預期結果

- ✅ 第一次 Google 登入：建立新會員記錄
- ✅ 重複 Google 登入：直接返回 token
- ✅ 返回的 token 包含 member custom claim
- ✅ 可以使用 token 訪問需要 member 權限的 API
- ✅ Firestore 中 members collection 有正確的會員記錄

## 注意事項

1. **Custom Claims 刷新時間**
   - 設定 custom claims 後，需要刷新 token 才能生效
   - 使用 refreshToken 可以立即獲取新的 idToken

2. **會員資料初始化**
   - Google 登入時，phone 欄位為 null
   - 使用 displayName 作為初始 name
   - 後續可透過 `PUT /api/member` 更新資料

3. **錯誤處理**
   - Token 過期：要求重新登入
   - Token 無效：返回 400 錯誤
   - 其他錯誤：返回 401 錯誤

4. **安全性**
   - idToken 由 Firebase Admin SDK 驗證，確保安全性
   - Custom Claims 只能由後端設定，前端無法偽造
   - refreshToken 應妥善保管，不應暴露在日誌中

## API 規格

### POST /api/auth/member/signInWithGoogle

會員 Google 第三方登入端點

**Request Body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "refreshToken": "AOEOulZ..."
}
```

**Response (200 OK):**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "refreshToken": "AOEOulZ...",
  "expiresIn": "3600",
  "uid": "abc123...",
  "message": "註冊並登入成功"
}
```

**Error Responses:**
- 400 Bad Request: 無效的 ID Token
- 401 Unauthorized: 登入已過期或 Google 登入失敗

---

### POST /api/auth/admin/signInWithGoogle

管理員 Google 第三方登入端點

**Request Body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "refreshToken": "AOEOulZ..."
}
```

**Response (200 OK):**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "refreshToken": "AOEOulZ...",
  "expiresIn": "3600",
  "uid": "abc123...",
  "message": "註冊並登入成功"
}
```

**Error Responses:**
- 400 Bad Request: 無效的 ID Token
- 401 Unauthorized: 登入已過期或管理員 Google 登入失敗
