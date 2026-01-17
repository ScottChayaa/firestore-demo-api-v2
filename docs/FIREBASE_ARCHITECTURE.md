# Firebase 架構設計

本文件說明專案中 Firebase 模組的架構設計原則與最佳實踐。

---

## 架構概述

本專案採用 **Token-based Dependency Injection** 模式來管理 Firebase 服務。透過 NestJS 的依賴注入機制，我們將 Firebase 的各個服務拆分為獨立的注入 Token。

### 提供的注入 Token

| Token | 說明 | 類型 |
|-------|------|------|
| `FIREBASE_APP` | Firebase Admin App 實例 | `admin.app.App` |
| `FIRESTORE` | Firestore 資料庫實例 | `admin.firestore.Firestore` |
| `FIREBASE_AUTH` | Firebase 認證服務 | `admin.auth.Auth` |
| `STORAGE` | Cloud Storage Bucket | `Bucket` |

所有 Token 定義於 `src/firebase/firebase.constants.ts`，使用 Symbol 確保唯一性：

```typescript
export const FIREBASE_APP = Symbol('FIREBASE_APP');
export const FIRESTORE = Symbol('FIRESTORE');
export const FIREBASE_AUTH = Symbol('FIREBASE_AUTH');
export const STORAGE = Symbol('STORAGE');
```

---

## 為什麼使用 Token 注入而非 FirebaseService

### 1. 單一職責原則 (SRP)

每個 Token 只負責提供一種服務，而非將所有 Firebase 功能塞入單一 Service：

```typescript
// 不推薦：單一服務包含所有功能
class FirebaseService {
  getFirestore() { ... }
  getAuth() { ... }
  getStorage() { ... }
}

// 推薦：各服務獨立注入
@Inject(FIRESTORE) private firestore: admin.firestore.Firestore
@Inject(FIREBASE_AUTH) private auth: admin.auth.Auth
```

### 2. 介面隔離原則 (ISP)

元件只依賴它實際需要的服務，不會被迫依賴不需要的介面：

```typescript
// Repository 只需要 Firestore
class MembersRepository {
  constructor(@Inject(FIRESTORE) private firestore) {}
}

// Guard 只需要 Auth
class FirebaseAuthGuard {
  constructor(@Inject(FIREBASE_AUTH) private auth) {}
}
```

### 3. NestJS 官方建議做法

使用 `useFactory` 配合 Custom Provider Token 是 NestJS 管理外部服務的標準模式，符合框架設計理念。

### 4. 測試 Mock 更容易

獨立 Token 讓單元測試時可以輕鬆替換特定服務：

```typescript
const module = await Test.createTestingModule({
  providers: [
    MembersRepository,
    {
      provide: FIRESTORE,
      useValue: mockFirestore,  // 只 mock 需要的服務
    },
  ],
}).compile();
```

---

## 使用方式範例

### Repository 注入 FIRESTORE

```typescript
import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIRESTORE } from '../../firebase/firebase.constants';

@Injectable()
export class MembersRepository {
  private readonly collection: admin.firestore.CollectionReference;

  constructor(
    @Inject(FIRESTORE) private readonly firestore: admin.firestore.Firestore,
  ) {
    this.collection = this.firestore.collection('members');
  }

  async findById(uid: string) {
    const doc = await this.collection.doc(uid).get();
    return doc.exists ? doc.data() : null;
  }
}
```

### Guard 注入 FIREBASE_AUTH

```typescript
import { Injectable, Inject, CanActivate, ExecutionContext } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_AUTH } from '../../firebase/firebase.constants';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject(FIREBASE_AUTH) private auth: admin.auth.Auth,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.substring(7);

    const decodedToken = await this.auth.verifyIdToken(token);
    request.user = decodedToken;
    return true;
  }
}
```

### Service 注入 STORAGE

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { Bucket } from '@google-cloud/storage';
import { STORAGE } from '../firebase/firebase.constants';

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE) private readonly bucket: Bucket,
  ) {}

  async deleteFile(filePath: string): Promise<void> {
    const file = this.bucket.file(filePath);
    await file.delete();
  }
}
```

---

## 關於 `import * as admin` 的說明

你可能會在程式碼中看到：

```typescript
import * as admin from 'firebase-admin';
```

**這只用於 TypeScript 類型定義**，不會重複初始化 Firebase。

### 為什麼安全？

1. **Firebase Admin SDK 的單例機制**：`admin.initializeApp()` 只在 `FirebaseModule` 的 `FIREBASE_APP` factory 中呼叫一次
2. **類型參考不等於實例化**：`admin.firestore.Firestore` 只是類型，不會觸發初始化
3. **依賴注入提供實例**：實際的 Firestore/Auth/Storage 實例由 NestJS DI 容器管理

### 正確用法

```typescript
import * as admin from 'firebase-admin';  // 只用於類型
import { FIRESTORE } from '../../firebase/firebase.constants';

@Injectable()
export class MyRepository {
  constructor(
    // 類型標註使用 admin.firestore.Firestore
    // 實例由 DI 注入，不會重複初始化
    @Inject(FIRESTORE) private readonly firestore: admin.firestore.Firestore,
  ) {}
}
```

---

## 各 Token 使用情況

### FIRESTORE

用於資料庫 CRUD 操作的 Repository 層：

| 檔案 | 用途 |
|------|------|
| `src/members/repositories/members.repository.ts` | 會員資料存取 |
| `src/orders/repositories/orders.repository.ts` | 訂單資料存取 |
| `src/admins/repositories/admins.repository.ts` | 管理員資料存取 |
| `src/products/products.repository.ts` | 商品資料存取 |
| `src/files/repositories/files.repository.ts` | 檔案紀錄存取 |

### FIREBASE_AUTH

用於身份驗證相關功能：

| 檔案 | 用途 |
|------|------|
| `src/common/guards/firebase-auth.guard.ts` | Token 驗證守衛 |
| `src/auth/auth.service.ts` | 認證服務 |
| `src/members/services/members-admin.service.ts` | 管理員管理會員 Auth |
| `src/admins/services/admins-admin.service.ts` | 管理員 Auth 管理 |

### STORAGE

用於 Cloud Storage 檔案操作：

| 檔案 | 用途 |
|------|------|
| `src/storage/storage.service.ts` | 檔案上傳/刪除服務 |
| `src/webhooks/services/thumbnail.service.ts` | 縮圖處理服務 |

---

## 最佳實踐摘要

1. **永遠使用 Token 注入**：不要直接 `import firebase-admin` 並呼叫方法
2. **只注入需要的服務**：遵循介面隔離原則
3. **Repository 使用 FIRESTORE**：資料存取邏輯集中於 Repository 層
4. **Guard 使用 FIREBASE_AUTH**：認證邏輯在守衛中處理
5. **測試時 Mock Token**：利用 DI 機制輕鬆替換依賴
