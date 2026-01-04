# 📘 Phase 1 - 前期階段：基礎架構建立

> **目標**：建立 NestJS 專案骨架，配置核心服務
> **預計完成項目**：11 項
> **測試點**：完成後需進行健康檢查、日誌測試、Firebase 連接測試

---

## ✅ 任務清單

### 1. 初始化 NestJS 專案（使用最新版本）
- [ ] 使用 `@nestjs/cli` 創建專案
- [ ] 檢查 NestJS 版本（需 v10+）
- [ ] 安裝核心依賴
- [ ] 設定 TypeScript 配置

**執行命令**：
```bash
npx @nestjs/cli new firestore-demo-api-v2
cd firestore-demo-api-v2
npm install
```

**驗證**：
```bash
npm run start
# 應該能在 http://localhost:3000 看到 Hello World
```

---

### 2. 配置環境變數支援（.env 和 env.yaml）
- [ ] 安裝 `@nestjs/config`
- [ ] 安裝 `js-yaml` 用於讀取 env.yaml
- [ ] 創建 `src/config/configuration.ts`
- [ ] 在 AppModule 註冊 ConfigModule
- [ ] 創建 `.env.example`

**核心配置項**：
```typescript
// configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    webApiKey: process.env.FIREBASE_WEB_API_KEY,
    databaseId: process.env.FIRESTORE_DATABASE_ID,
    credentialsBase64: process.env.GOOGLE_CREDENTIALS_BASE64,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logResponseBody: process.env.LOG_RESPONSE_BODY === 'true',
  },
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT, 10) || 20,
    maxLimit: parseInt(process.env.MAX_PAGE_LIMIT, 10) || 100,
  },
});
```

**驗證**：
```bash
# 確認能讀取環境變數
console.log(this.configService.get('firebase.projectId'));
```

---

### 3. 建立 Firebase Admin SDK 模組和 Firestore 連接
- [ ] 安裝 `firebase-admin`
- [ ] 創建 `src/firebase/firebase.module.ts`
- [ ] 創建 `src/firebase/firebase.service.ts`
- [ ] 實作 Base64 解碼 Service Account
- [ ] 提供 FIRESTORE provider

**核心程式碼**：
```typescript
// firebase.module.ts
@Module({
  providers: [
    {
      provide: 'FIREBASE_APP',
      useFactory: (configService: ConfigService) => {
        const credentialsBase64 = configService.get('firebase.credentialsBase64');
        const credentials = JSON.parse(
          Buffer.from(credentialsBase64, 'base64').toString('utf-8')
        );

        return admin.initializeApp({
          credential: admin.credential.cert(credentials),
          databaseURL: `https://${configService.get('firebase.projectId')}.firebaseio.com`,
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'FIRESTORE',
      useFactory: (app: admin.app.App) => app.firestore(),
      inject: ['FIREBASE_APP'],
    },
  ],
  exports: ['FIREBASE_APP', 'FIRESTORE'],
})
export class FirebaseModule {}
```

**驗證**：
```typescript
// 測試連接
const db = this.firestore;
const testDoc = await db.collection('_test').doc('connection').get();
console.log('Firestore connected:', testDoc.exists);
```

---

### 4. 設置 Pino 日誌系統（使用 nestjs-pino）
- [ ] 安裝 `nestjs-pino`, `pino-http`, `pino-pretty`
- [ ] 創建 `src/common/logger/logger.module.ts`
- [ ] 配置開發/生產環境不同的日誌格式
- [ ] 在 AppModule 註冊 LoggerModule

**安裝**：
```bash
npm install nestjs-pino pino-http pino-pretty
```

**配置**：
```typescript
// logger.module.ts
import { LoggerModule } from 'nestjs-pino';

LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
    autoLogging: true,
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
      if (res.statusCode >= 500 || err) return 'error';
      return 'info';
    },
  },
})
```

**驗證**：
```bash
# 啟動專案，應該能看到彩色的 HTTP 日誌
curl http://localhost:3000
```

---

### 5. 實現基礎 Guards（AuthGuard、RoleGuard）
- [ ] 創建 `src/common/guards/auth.guard.ts`
- [ ] 創建 `src/common/guards/roles.guard.ts`
- [ ] 創建 `src/common/decorators/roles.decorator.ts`
- [ ] 創建 `src/common/decorators/current-user.decorator.ts`

**AuthGuard**：
```typescript
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    const token = authHeader.substring(7);
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      request.user = decodedToken;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

**RolesGuard**：
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 檢查 custom claims
    return requiredRoles.some(role => user[role] === true);
  }
}
```

**驗證**：
```typescript
// 使用範例
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('member')
@Get('profile')
getProfile() { ... }
```

---

### 6. 實現全域 Exception Filter（錯誤處理）
- [ ] 創建 `src/common/filters/http-exception.filter.ts`
- [ ] 處理 Firebase 錯誤
- [ ] 處理 Validation 錯誤
- [ ] 在 main.ts 註冊全域 Filter

**實作**：
```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof FirebaseError) {
      // 處理 Firebase 特定錯誤
      status = this.mapFirebaseError(exception);
      message = exception.message;
    }

    this.logger.error({ exception, request }, 'Exception occurred');

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

**驗證**：
```bash
# 測試錯誤處理
curl http://localhost:3000/non-existent
# 應該回傳 404 JSON 錯誤
```

---

### 7. 實現 HTTP Logger Interceptor
- [ ] 創建 `src/common/interceptors/logging.interceptor.ts`
- [ ] 記錄請求/回應時間
- [ ] 記錄 Response Body（可配置）
- [ ] 在 main.ts 註冊

**實作**：
```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(data => {
        const responseTime = Date.now() - startTime;
        const logResponseBody = this.configService.get('logging.logResponseBody');

        this.logger.info({
          method,
          url,
          responseTime,
          ...(logResponseBody && { responseBody: data }),
        }, 'HTTP Request Completed');
      }),
    );
  }
}
```

**驗證**：
```bash
# 查看日誌是否包含 responseTime
```

---

### 8. 配置 CORS、Helmet 等安全設定
- [ ] 安裝 `helmet`
- [ ] 在 main.ts 配置 CORS
- [ ] 在 main.ts 配置 Helmet
- [ ] 設定全域前綴 `/api`

**實作**：
```typescript
// main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 安全性
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // 全域前綴
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT || 8080);
}
```

**驗證**：
```bash
curl -I http://localhost:3000/api
# 應該看到 X-Frame-Options, X-Content-Type-Options 等 headers
```

---

### 9. 建立 Docker 配置（firestore-demo-api-v2）
- [ ] 創建 `Dockerfile`
- [ ] 創建 `.dockerignore`
- [ ] 創建 `docker-compose.yml`（開發用）
- [ ] 測試 Docker build

**Dockerfile**：
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/main.js"]
```

**驗證**：
```bash
docker build -t firestore-demo-api-v2:latest .
docker run -p 8080:8080 firestore-demo-api-v2:latest
```

---

### 10. 建立基礎的分頁工具（Cursor-based Pagination）
- [ ] 創建 `src/common/pagination/pagination.interface.ts`
- [ ] 創建 `src/common/pagination/pagination.dto.ts`
- [ ] 創建 `src/common/pagination/pagination.helper.ts`

**Interface**：
```typescript
export interface PaginationResult<T> {
  data: T[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
    count: number;
  };
}

export interface PaginationQuery {
  cursor?: string;
  limit?: number;
  order?: 'asc' | 'desc';
}
```

**Helper**：
```typescript
export class PaginationHelper {
  static async paginate<T>(
    query: FirebaseFirestore.Query,
    options: PaginationQuery,
  ): Promise<PaginationResult<T>> {
    const { cursor, limit = 20, order = 'desc' } = options;

    let paginatedQuery = query.limit(limit + 1);

    if (cursor) {
      const cursorDoc = await query.firestore.doc(cursor).get();
      paginatedQuery = paginatedQuery.startAfter(cursorDoc);
    }

    const snapshot = await paginatedQuery.get();
    const docs = snapshot.docs;
    const hasMore = docs.length > limit;

    if (hasMore) docs.pop();

    return {
      data: docs.map(doc => ({ id: doc.id, ...doc.data() } as T)),
      pagination: {
        limit,
        hasMore,
        nextCursor: hasMore ? docs[docs.length - 1].ref.path : undefined,
        count: docs.length,
      },
    };
  }
}
```

**驗證**：
```typescript
// 測試分頁
const result = await PaginationHelper.paginate(
  db.collection('members'),
  { limit: 10 }
);
console.log(result);
```

---

### 11. 創建健康檢查端點
- [ ] 創建 `src/health/health.module.ts`
- [ ] 創建 `src/health/health.controller.ts`
- [ ] 實作 `/health` 和 `/` 端點

**實作**：
```typescript
@Controller()
export class HealthController {
  @Get()
  getRoot() {
    return {
      message: 'Firestore Demo API v2',
      version: process.env.IMAGE_VERSION || '0.0.1',
      environment: process.env.NODE_ENV,
    };
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

**驗證**：
```bash
curl http://localhost:8080/
curl http://localhost:8080/health
```

---

## 🎯 Phase 1 完成標準

完成以下所有項目後，視為 Phase 1 完成：

- ✅ NestJS 專案能正常啟動
- ✅ Firebase Firestore 能正常連接
- ✅ 日誌系統運作正常（彩色輸出 + JSON）
- ✅ 環境變數能正確讀取
- ✅ Guards 能正確驗證 Token
- ✅ 錯誤處理能正常運作
- ✅ Docker image 能成功 build
- ✅ 健康檢查端點正常回應
- ✅ 分頁工具能正確運作

---

## 📝 測試清單

完成後請執行以下測試：

```bash
# 1. 本地啟動測試
npm run start:dev

# 2. 健康檢查
curl http://localhost:8080/
curl http://localhost:8080/health

# 3. 日誌測試（觀察 console 輸出）
curl http://localhost:8080/api/non-existent

# 4. Firebase 連接測試（需在程式碼中暫時加入測試邏輯）
# 檢查能否讀取 Firestore collection

# 5. Docker 測試
docker build -t firestore-demo-api-v2:latest .
docker run -p 8080:8080 --env-file .env firestore-demo-api-v2:latest
```

---

## 🔄 下一步

Phase 1 完成並測試通過後，進入 **Phase 2 - 中期階段**，開始實作核心業務模組。
