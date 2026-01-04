# 📙 Phase 3 - 後期階段：高級功能與完善

> **目標**：完成剩餘功能並優化整體專案
> **預計完成項目**：9 項
> **測試點**：完成後需進行完整的端到端測試

---

## ✅ 任務清單

### 1. 實現管理員模組（Admins Module - 完整 CRUD）
- [ ] 創建 `src/admins/admins.module.ts`
- [ ] 創建 `src/admins/admins.controller.ts`
- [ ] 創建 `src/admins/admins.service.ts`
- [ ] 創建 `src/admins/admins.repository.ts`
- [ ] 實作完整的 CRUD 操作
- [ ] 實作軟刪除和恢復功能

**API 端點**：
```
GET    /api/admin/admins              # 取得所有管理員
POST   /api/admin/admins              # 建立管理員
POST   /api/admin/admins/create-role  # 為現有帳號賦予管理員角色
GET    /api/admin/admins/:id          # 取得單一管理員
PUT    /api/admin/admins/:id          # 更新管理員
PATCH  /api/admin/admins/:id/password # 更新密碼
DELETE /api/admin/admins/:id          # 刪除管理員（軟刪除）
PATCH  /api/admin/admins/:id/toggle-status  # 切換啟用狀態
POST   /api/admin/admins/:id/restore  # 恢復已刪除的管理員
```

**Repository 實作**：
```typescript
@Injectable()
export class AdminsRepository {
  constructor(@Inject('FIRESTORE') private firestore: Firestore) {}

  async findAll(query: AdminQueryDto): Promise<PaginationResult<Admin>> {
    let firestoreQuery = this.firestore.collection('admins');

    if (!query.includeDeleted) {
      firestoreQuery = firestoreQuery.where('deletedAt', '==', null);
    }

    if (query.isActive !== undefined) {
      firestoreQuery = firestoreQuery.where('isActive', '==', query.isActive);
    }

    firestoreQuery = firestoreQuery.orderBy('createdAt', query.order || 'desc');

    return PaginationHelper.paginate<Admin>(firestoreQuery, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  async findById(id: string): Promise<Admin> {
    const doc = await this.firestore.collection('admins').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('管理員不存在');
    }
    return this.mapToEntity(doc);
  }

  async create(uid: string, data: CreateAdminDto): Promise<Admin> {
    const adminData = {
      uid,
      email: data.email,
      displayName: data.displayName,
      isActive: true,
      deletedAt: null,
      deletedBy: null,
      createdAt: FieldValue.serverTimestamp(),
    };

    await this.firestore.collection('admins').doc(uid).set(adminData);
    return this.findById(uid);
  }

  // ... 其他方法類似 MembersRepository
}
```

**Service 實作**：
```typescript
@Injectable()
export class AdminsService {
  constructor(
    private readonly adminsRepo: AdminsRepository,
    @Inject('FIREBASE_APP') private firebaseApp: admin.app.App,
  ) {}

  async create(dto: CreateAdminDto) {
    // 1. 建立 Firebase Auth 用戶
    const userRecord = await this.firebaseApp.auth().createUser({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
    });

    // 2. 設定 Custom Claims（admin 角色）
    await this.firebaseApp.auth().setCustomUserClaims(userRecord.uid, {
      admin: true,
    });

    // 3. 建立 Firestore document
    return this.adminsRepo.create(userRecord.uid, dto);
  }

  async createRole(dto: CreateAdminRoleDto) {
    // 為現有的 Firebase Auth 用戶賦予管理員角色
    await this.firebaseApp.auth().setCustomUserClaims(dto.uid, {
      admin: true,
    });

    // 建立 Firestore document
    const user = await this.firebaseApp.auth().getUser(dto.uid);
    return this.adminsRepo.create(dto.uid, {
      email: user.email,
      displayName: dto.displayName,
    });
  }

  // ... 其他方法類似 MembersService
}
```

**驗證**：
```bash
# 建立管理員
curl -X POST -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin2@example.com","password":"qwer1234","displayName":"管理員2"}' \
  http://localhost:8080/api/admin/admins

# 取得管理員列表
curl -H "Authorization: Bearer {admin_token}" \
  http://localhost:8080/api/admin/admins
```

---

### 2. 實現訂單模組（Orders Module - 完整 CRUD 和查詢）
- [ ] 創建 `src/orders/orders.module.ts`
- [ ] 創建 `src/orders/orders.controller.ts`（管理員用）
- [ ] 創建 `src/orders/member-orders.controller.ts`（會員用）
- [ ] 創建 `src/orders/orders.service.ts`
- [ ] 創建 `src/orders/orders.repository.ts`
- [ ] 實作訂單編號生成（ORD-YYYYMMDD-XXXXX）

**API 端點（管理員）**：
```
GET    /api/admin/orders     # 取得所有訂單（支援多條件篩選）
GET    /api/admin/orders/:id # 取得單一訂單
POST   /api/admin/orders     # 建立訂單
PUT    /api/admin/orders/:id # 更新訂單狀態
DELETE /api/admin/orders/:id # 刪除訂單
```

**API 端點（會員）**：
```
GET /api/member/orders  # 取得自己的訂單（支援狀態、日期、金額篩選）
```

**Repository 實作**：
```typescript
@Injectable()
export class OrdersRepository {
  constructor(@Inject('FIRESTORE') private firestore: Firestore) {}

  async findAll(query: OrderQueryDto): Promise<PaginationResult<Order>> {
    let firestoreQuery = this.firestore.collection('orders');

    // 會員篩選
    if (query.memberId) {
      firestoreQuery = firestoreQuery.where('memberId', '==', query.memberId);
    }

    // 狀態篩選
    if (query.status) {
      firestoreQuery = firestoreQuery.where('status', '==', query.status);
    }

    // 日期範圍篩選
    if (query.minCreatedAt) {
      firestoreQuery = firestoreQuery.where(
        'createdAt',
        '>=',
        Timestamp.fromDate(new Date(query.minCreatedAt))
      );
    }
    if (query.maxCreatedAt) {
      firestoreQuery = firestoreQuery.where(
        'createdAt',
        '<=',
        Timestamp.fromDate(new Date(query.maxCreatedAt))
      );
    }

    // 金額範圍篩選
    if (query.minAmount) {
      firestoreQuery = firestoreQuery.where('totalAmount', '>=', query.minAmount);
    }
    if (query.maxAmount) {
      firestoreQuery = firestoreQuery.where('totalAmount', '<=', query.maxAmount);
    }

    // 排序
    const orderBy = query.orderBy || 'createdAt';
    firestoreQuery = firestoreQuery.orderBy(orderBy, query.order || 'desc');

    return PaginationHelper.paginate<Order>(firestoreQuery, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  async create(data: CreateOrderDto): Promise<Order> {
    const orderNumber = this.generateOrderNumber();

    const orderData = {
      memberId: data.memberId,
      orderNumber,
      items: data.items,
      totalAmount: data.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await this.firestore.collection('orders').add(orderData);
    return this.findById(docRef.id);
  }

  private generateOrderNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${dateStr}-${random}`;
  }

  // ... 其他方法
}
```

**查詢 DTO**：
```typescript
export class OrderQueryDto extends PaginationDto {
  @IsOptional()
  @IsFirebaseUID()
  memberId?: string;

  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsISO8601()
  minCreatedAt?: string;

  @IsOptional()
  @IsISO8601()
  maxCreatedAt?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxAmount?: number;

  @IsOptional()
  @IsEnum(['createdAt', 'totalAmount'])
  orderBy?: string;
}

export class CreateOrderDto {
  @IsFirebaseUID()
  memberId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}
```

**會員訂單 Controller**：
```typescript
@Controller('api/member/orders')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('member')
export class MemberOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async getMyOrders(
    @CurrentUser() user: DecodedIdToken,
    @Query() query: OrderQueryDto,
  ) {
    // 強制只查詢自己的訂單
    query.memberId = user.uid;
    return this.ordersService.findAll(query);
  }
}
```

**驗證**：
```bash
# 管理員建立訂單
curl -X POST -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": "member_uid",
    "items": [
      {"productId": "p1", "productName": "商品1", "quantity": 2, "price": 1000}
    ]
  }' \
  http://localhost:8080/api/admin/orders

# 會員查詢自己的訂單
curl -H "Authorization: Bearer {member_token}" \
  "http://localhost:8080/api/member/orders?status=pending"

# 管理員查詢所有訂單（支援篩選）
curl -H "Authorization: Bearer {admin_token}" \
  "http://localhost:8080/api/admin/orders?status=completed&minAmount=1000"
```

---

### 3. 實現郵件服務模組（Mail Module - Nodemailer 整合）
- [ ] 創建 `src/mail/mail.module.ts`
- [ ] 創建 `src/mail/mail.service.ts`
- [ ] 創建 `src/mail/mail.controller.ts`
- [ ] 配置 Nodemailer SMTP
- [ ] 實作發送郵件功能

**安裝**：
```bash
npm install nodemailer
npm install -D @types/nodemailer
```

**Mail Service**：
```typescript
@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('smtp.host'),
      port: this.configService.get('smtp.port'),
      secure: this.configService.get('smtp.port') === 465,
      auth: {
        user: this.configService.get('smtp.user'),
        pass: this.configService.get('smtp.password'),
      },
    });
  }

  async sendMail(dto: SendMailDto) {
    const mailOptions = {
      from: `"${this.configService.get('smtp.fromName')}" <${this.configService.get('smtp.fromEmail')}>`,
      to: dto.to,
      subject: dto.subject,
      text: dto.text,
      html: dto.html,
    };

    const info = await this.transporter.sendMail(mailOptions);
    return {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    };
  }

  async sendPasswordResetEmail(email: string, resetLink: string) {
    return this.sendMail({
      to: email,
      subject: '重設密碼',
      html: `
        <h2>重設密碼</h2>
        <p>請點擊以下連結重設密碼：</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>此連結將在 1 小時後過期。</p>
      `,
    });
  }
}
```

**Controller**：
```typescript
@Controller('send-email')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post()
  @UseGuards(ThrottlerGuard) // 使用頻率限制
  async sendEmail(@Body() dto: SendMailDto) {
    return this.mailService.sendMail(dto);
  }
}
```

**驗證**：
```bash
curl -X POST http://localhost:8080/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "測試郵件",
    "text": "這是測試內容"
  }'
```

---

### 4. 實現 Rate Limiter（API 頻率限制）
- [ ] 安裝 `@nestjs/throttler`
- [ ] 配置 ThrottlerModule
- [ ] 對郵件端點設定頻率限制
- [ ] 自訂頻率限制錯誤訊息

**安裝**：
```bash
npm install @nestjs/throttler
```

**配置**：
```typescript
// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 秒
        limit: 10,  // 最多 10 次請求
      },
    ]),
    // ... 其他模組
  ],
})
```

**使用**：
```typescript
// 對特定端點應用頻率限制
@UseGuards(ThrottlerGuard)
@Post('send-email')
async sendEmail(@Body() dto: SendMailDto) {
  // ...
}
```

**自訂錯誤訊息**：
```typescript
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    response.status(429).json({
      statusCode: 429,
      message: '請求過於頻繁，請稍後再試',
      error: 'Too Many Requests',
    });
  }
}
```

**驗證**：
```bash
# 快速發送多次請求，應該會被限制
for i in {1..15}; do
  curl -X POST http://localhost:8080/send-email \
    -H "Content-Type: application/json" \
    -d '{"to":"test@example.com","subject":"test","text":"test"}'
done
```

---

### 5. 遷移測試資料生成腳本（seed.js）
- [ ] 創建 `src/scripts/seed.ts`
- [ ] 實作會員生成（預設 100 筆）
- [ ] 實作訂單生成（預設 500 筆）
- [ ] 實作商品生成（預設 50 筆）
- [ ] 實作管理員生成（1 筆）
- [ ] 添加 npm script

**Seed Script**：
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FirebaseService } from '../firebase/firebase.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const firebaseService = app.get(FirebaseService);
  const firestore = firebaseService.getFirestore();
  const auth = firebaseService.getAuth();

  const MEMBERS_COUNT = parseInt(process.env.SEED_MEMBERS_COUNT) || 100;
  const ORDERS_COUNT = parseInt(process.env.SEED_ORDERS_COUNT) || 500;
  const PRODUCTS_COUNT = parseInt(process.env.SEED_PRODUCTS_COUNT) || 50;

  console.log('🌱 開始生成測試資料...');

  // 1. 生成商品
  console.log(`📦 生成 ${PRODUCTS_COUNT} 筆商品...`);
  const categories = ['electronics', 'clothing', 'food', 'books', 'sports'];
  const products = [];

  for (let i = 1; i <= PRODUCTS_COUNT; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const product = {
      name: `商品 ${i}`,
      description: `這是商品 ${i} 的描述`,
      price: Math.floor(Math.random() * 5000) + 500,
      category,
      stock: Math.floor(Math.random() * 100) + 10,
      imageUrl: `https://picsum.photos/400/300?random=${i}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await firestore.collection('products').add(product);
    products.push({ id: docRef.id, ...product });
  }

  // 2. 生成會員
  console.log(`👥 生成 ${MEMBERS_COUNT} 筆會員...`);
  const members = [];

  for (let i = 1; i <= MEMBERS_COUNT; i++) {
    const email = `member${i}@example.com`;
    const password = 'qwer1234';

    // 建立 Firebase Auth 用戶
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `會員${i}`,
    });

    // 設定 Custom Claims
    await auth.setCustomUserClaims(userRecord.uid, { member: true });

    // 建立 Firestore document
    const memberData = {
      email,
      name: `會員${i}`,
      phone: `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      isActive: Math.random() > 0.1, // 90% 啟用
      deletedAt: null,
      deletedBy: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await firestore.collection('members').doc(userRecord.uid).set(memberData);
    members.push({ id: userRecord.uid, ...memberData });
  }

  // 3. 生成訂單
  console.log(`📋 生成 ${ORDERS_COUNT} 筆訂單...`);

  for (let i = 1; i <= ORDERS_COUNT; i++) {
    const member = members[Math.floor(Math.random() * members.length)];
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = [];

    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      items.push({
        productId: product.id,
        productName: product.name,
        quantity: Math.floor(Math.random() * 3) + 1,
        price: product.price,
      });
    }

    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const statuses = ['pending', 'processing', 'completed', 'cancelled'];

    const orderData = {
      memberId: member.id,
      orderNumber: `ORD-${Date.now()}-${i}`,
      items,
      totalAmount,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await firestore.collection('orders').add(orderData);
  }

  // 4. 生成管理員
  console.log('👑 生成管理員...');
  const adminEmail = 'admin@example.com';
  const adminPassword = 'qwer1234';

  const adminRecord = await auth.createUser({
    email: adminEmail,
    password: adminPassword,
    displayName: '系統管理員',
  });

  await auth.setCustomUserClaims(adminRecord.uid, { admin: true });

  await firestore.collection('admins').doc(adminRecord.uid).set({
    uid: adminRecord.uid,
    email: adminEmail,
    displayName: '系統管理員',
    isActive: true,
    deletedAt: null,
    deletedBy: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('✅ 測試資料生成完成！');
  console.log(`   會員: ${MEMBERS_COUNT} 筆`);
  console.log(`   訂單: ${ORDERS_COUNT} 筆`);
  console.log(`   商品: ${PRODUCTS_COUNT} 筆`);
  console.log(`   管理員: admin@example.com (密碼: qwer1234)`);

  await app.close();
}

bootstrap();
```

**package.json**：
```json
{
  "scripts": {
    "seed": "ts-node -r tsconfig-paths/register src/scripts/seed.ts"
  }
}
```

**驗證**：
```bash
npm run seed
```

---

### 6. 遷移清理腳本（clean-firestore.js、clean-auth.js）
- [ ] 創建 `src/scripts/clean-firestore.ts`
- [ ] 創建 `src/scripts/clean-auth.ts`
- [ ] 創建 `src/scripts/clean-all.ts`
- [ ] 添加 npm scripts

**clean-firestore.ts**：
```typescript
async function cleanFirestore() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const firebaseService = app.get(FirebaseService);
  const firestore = firebaseService.getFirestore();

  const collections = ['members', 'admins', 'orders', 'products'];

  console.log('🧹 開始清理 Firestore...');

  for (const collectionName of collections) {
    console.log(`   清理 ${collectionName}...`);
    const snapshot = await firestore.collection(collectionName).get();

    const batchSize = 500;
    let batch = firestore.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      count++;

      if (count % batchSize === 0) {
        await batch.commit();
        batch = firestore.batch();
      }
    }

    if (count % batchSize !== 0) {
      await batch.commit();
    }

    console.log(`   ✅ ${collectionName}: ${count} 筆已刪除`);
  }

  console.log('✅ Firestore 清理完成！');
  await app.close();
}
```

**clean-auth.ts**：
```typescript
async function cleanAuth() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const firebaseService = app.get(FirebaseService);
  const auth = firebaseService.getAuth();

  console.log('🧹 開始清理 Firebase Auth...');

  const listUsersResult = await auth.listUsers();
  const uids = listUsersResult.users.map(user => user.uid);

  for (const uid of uids) {
    await auth.deleteUser(uid);
  }

  console.log(`✅ Firebase Auth 清理完成！共刪除 ${uids.length} 個用戶`);
  await app.close();
}
```

**package.json**：
```json
{
  "scripts": {
    "clean:firestore": "ts-node src/scripts/clean-firestore.ts",
    "clean:auth": "ts-node src/scripts/clean-auth.ts",
    "clean:all": "npm run clean:firestore && npm run clean:auth"
  }
}
```

---

### 7. 建立 API 端點測試（使用 Jest + Supertest）
- [ ] 創建 `test/auth.e2e-spec.ts`
- [ ] 創建 `test/members.e2e-spec.ts`
- [ ] 創建 `test/orders.e2e-spec.ts`
- [ ] 創建 `test/products.e2e-spec.ts`
- [ ] 配置測試環境

**測試範例（auth.e2e-spec.ts）**：
```typescript
describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/auth/register (POST)', () => {
    it('should register a new member', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'qwer1234',
          name: '測試用戶',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('uid');
          expect(res.body.message).toBe('註冊成功');
        });
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'qwer1234',
          name: '測試用戶',
        })
        .expect(400);
    });
  });

  describe('/api/auth/member/signInWithPassword (POST)', () => {
    it('should sign in and return token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/member/signInWithPassword')
        .send({
          email: 'member1@example.com',
          password: 'qwer1234',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('idToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });
  });
});
```

**執行測試**：
```bash
npm run test:e2e
```

---

### 8. 更新 README.md 和專案文檔
- [ ] 更新 README.md
- [ ] 創建 API 文檔
- [ ] 創建部署文檔
- [ ] 更新 CLAUDE.md

**README.md 結構**：
```markdown
# Firestore Demo API v2

基於 NestJS + Firebase + Firestore 的會員訂單管理系統

## 技術棧

- NestJS v10+
- Firebase Admin SDK
- Firestore
- TypeScript
- Docker

## 功能特點

- 🔐 Firebase Authentication（會員/管理員雙角色）
- 👥 會員管理（完整 CRUD + 軟刪除）
- 📦 商品管理（公開 API + 分類篩選）
- 📋 訂單系統（多條件查詢 + 狀態管理）
- 📧 郵件服務（Nodemailer + SMTP）
- 🔄 Cursor-based Pagination（高效能分頁）
- 📊 Pino Logger（結構化日誌）
- 🛡️ Rate Limiting（頻率限制）

## 快速開始

### 1. 安裝依賴
\`\`\`bash
npm install
\`\`\`

### 2. 配置環境變數
\`\`\`bash
cp .env.example .env
# 編輯 .env，填入 Firebase 配置
\`\`\`

### 3. 啟動開發伺服器
\`\`\`bash
npm run start:dev
\`\`\`

### 4. 生成測試資料
\`\`\`bash
npm run seed
\`\`\`

## API 文檔

詳見 [API.md](./docs/API.md)

## 部署

### Docker 部署
\`\`\`bash
docker build -t firestore-demo-api-v2:latest .
docker run -p 8080:8080 --env-file .env firestore-demo-api-v2:latest
\`\`\`

### Google Cloud Run 部署
詳見 [DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## 授權

MIT
```

---

### 9. 建立 .env.example 和配置說明
- [ ] 創建 `.env.example`
- [ ] 創建 `env.example.yaml`
- [ ] 創建配置說明文檔

**.env.example**：
```env
# Server
PORT=8080
NODE_ENV=development
IMAGE_VERSION=0.0.1

# Logging
LOG_LEVEL=info
LOG_RESPONSE_BODY=false
MAX_RESPONSE_BODY_LENGTH=10000

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_WEB_API_KEY=your-web-api-key
FIRESTORE_DATABASE_ID=(default)
GOOGLE_CREDENTIALS_BASE64=your-base64-encoded-service-account

# API
API_PREFIX=/api
CORS_ORIGIN=*

# Pagination
DEFAULT_PAGE_LIMIT=20
MAX_PAGE_LIMIT=100

# SMTP (Mail Service)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Firestore Demo API

# Rate Limiting
EMAIL_RATE_LIMIT_MINUTES=2
EMAIL_MAX_REQUESTS_PER_DAY=50

# Seed Data
SEED_MEMBERS_COUNT=100
SEED_ORDERS_COUNT=500
SEED_PRODUCTS_COUNT=50
```

**配置說明文檔**：
```markdown
# 環境變數配置說明

## Firebase 配置

### GOOGLE_CREDENTIALS_BASE64
將 Firebase Service Account JSON 檔案轉換為 Base64：

\`\`\`bash
base64 -i firebase-service-account.json | tr -d '\n'
\`\`\`

### FIREBASE_WEB_API_KEY
在 Firebase Console > 專案設定 > 一般 > 網頁 API 金鑰

## SMTP 配置（Gmail）

1. 啟用 2FA
2. 產生應用程式密碼
3. 使用應用程式密碼作為 SMTP_PASSWORD

## 日誌配置

- `LOG_LEVEL`: trace | debug | info | warn | error | fatal
- `LOG_RESPONSE_BODY`: 是否記錄 Response Body（開發環境建議 true）
```

---

## 🎯 Phase 3 完成標準

完成以下所有項目後，視為 Phase 3 完成：

- ✅ 管理員模組完整運作
- ✅ 訂單模組完整運作（管理員 + 會員端）
- ✅ 郵件服務能正常發送
- ✅ Rate Limiter 正確限制頻率
- ✅ 測試資料生成腳本正常運作
- ✅ 清理腳本正常運作
- ✅ E2E 測試通過
- ✅ 文檔完整
- ✅ .env.example 完整

---

## 📝 完整測試清單

```bash
# === 1. 清理並重新生成測試資料 ===
npm run clean:all
npm run seed

# === 2. 認證測試 ===
# 會員註冊
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"qwer1234","name":"新用戶"}'

# 會員登入
curl -X POST http://localhost:8080/api/auth/member/signInWithPassword \
  -H "Content-Type: application/json" \
  -d '{"email":"member1@example.com","password":"qwer1234"}'

# 管理員登入
curl -X POST http://localhost:8080/api/auth/admin/signInWithPassword \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"qwer1234"}'

# === 3. 商品測試（公開 API）===
curl http://localhost:8080/api/products
curl http://localhost:8080/api/products/categories
curl "http://localhost:8080/api/products?category=electronics&limit=5"

# === 4. 會員測試（需要會員 Token）===
# 取得自己的資料
curl -H "Authorization: Bearer {member_token}" \
  http://localhost:8080/api/member

# 查詢自己的訂單
curl -H "Authorization: Bearer {member_token}" \
  http://localhost:8080/api/member/orders

# === 5. 管理員 - 會員管理（需要管理員 Token）===
curl -H "Authorization: Bearer {admin_token}" \
  http://localhost:8080/api/admin/members

# === 6. 管理員 - 訂單管理 ===
curl -H "Authorization: Bearer {admin_token}" \
  "http://localhost:8080/api/admin/orders?status=completed&minAmount=1000"

# === 7. 管理員 - 管理員管理 ===
curl -H "Authorization: Bearer {admin_token}" \
  http://localhost:8080/api/admin/admins

# === 8. 郵件測試 ===
curl -X POST http://localhost:8080/send-email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"測試","text":"測試內容"}'

# === 9. Rate Limiter 測試 ===
for i in {1..15}; do
  curl -X POST http://localhost:8080/send-email \
    -H "Content-Type: application/json" \
    -d '{"to":"test@example.com","subject":"test","text":"test"}'
done

# === 10. E2E 測試 ===
npm run test:e2e

# === 11. Docker 測試 ===
docker build -t firestore-demo-api-v2:latest .
docker run -p 8080:8080 --env-file .env firestore-demo-api-v2:latest
```

---

## 🎉 專案完成！

恭喜！完成所有三個階段後，NestJS 遷移專案已經完成。

### 下一步建議：

1. **生產環境部署**：部署到 Google Cloud Run
2. **監控設定**：設置 Cloud Logging 和 Monitoring
3. **性能優化**：分析並優化慢查詢
4. **安全審查**：進行安全性檢查
5. **文檔完善**：補充更多使用範例

---

## 📚 相關文檔

- [Phase 1 - 前期階段](./PHASE-1-前期階段.md)
- [Phase 2 - 中期階段](./PHASE-2-中期階段.md)
- [Phase 3 - 後期階段](./PHASE-3-後期階段.md)（本文檔）
