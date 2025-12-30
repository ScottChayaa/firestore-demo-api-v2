# 📗 Phase 2 - 中期階段：核心業務模組遷移

> **目標**：遷移主要業務邏輯模組（Auth、Products、Members）
> **預計完成項目**：6 項
> **測試點**：完成後需測試註冊、登入、商品查詢、會員 CRUD

---

## ✅ 任務清單

### 1. 實現認證模組（Auth Module - 註冊、登入、忘記密碼）
- [ ] 創建 `src/auth/auth.module.ts`
- [ ] 創建 `src/auth/auth.controller.ts`
- [ ] 創建 `src/auth/auth.service.ts`
- [ ] 實作會員註冊（同時建立 Firebase Auth + Firestore）
- [ ] 實作會員登入（使用 Firebase REST API）
- [ ] 實作管理員登入
- [ ] 實作忘記密碼功能
- [ ] 創建相關 DTO

**API 端點**：
```
POST /api/auth/register
POST /api/auth/member/signInWithPassword
POST /api/auth/admin/signInWithPassword
POST /api/auth/forgot-password
```

**註冊流程**：
```typescript
async register(dto: RegisterDto) {
  // 1. 建立 Firebase Auth 用戶
  const userRecord = await admin.auth().createUser({
    email: dto.email,
    password: dto.password,
    displayName: dto.name,
  });

  // 2. 設定 Custom Claims（member 角色）
  await admin.auth().setCustomUserClaims(userRecord.uid, { member: true });

  // 3. 在 Firestore 建立 member document
  await this.firestore.collection('members').doc(userRecord.uid).set({
    email: dto.email,
    name: dto.name,
    phone: dto.phone || null,
    isActive: true,
    deletedAt: null,
    deletedBy: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { message: '註冊成功', uid: userRecord.uid };
}
```

**登入流程**：
```typescript
async signIn(dto: SignInDto) {
  // 使用 Firebase REST API 取得 ID Token
  const response = await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${webApiKey}`,
    {
      email: dto.email,
      password: dto.password,
      returnSecureToken: true,
    }
  );

  return {
    idToken: response.data.idToken,
    refreshToken: response.data.refreshToken,
    expiresIn: response.data.expiresIn,
  };
}
```

**DTO 範例**：
```typescript
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
```

**驗證**：
```bash
# 測試註冊
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"qwer1234","name":"測試用戶"}'

# 測試登入
curl -X POST http://localhost:8080/api/auth/member/signInWithPassword \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"qwer1234"}'
```

---

### 2. 實現商品模組（Products Module - 公開 API）
- [ ] 創建 `src/products/products.module.ts`
- [ ] 創建 `src/products/products.controller.ts`
- [ ] 創建 `src/products/products.service.ts`
- [ ] 創建 `src/products/products.repository.ts`
- [ ] 創建 `src/products/entities/product.entity.ts`
- [ ] 創建相關 DTO 和查詢參數

**API 端點**：
```
GET  /api/products              # 取得商品列表（支援分頁、篩選）
GET  /api/products/categories   # 取得分類列表
GET  /api/products/:id          # 取得單一商品
```

**Repository 模式**：
```typescript
@Injectable()
export class ProductsRepository {
  constructor(@Inject('FIRESTORE') private firestore: Firestore) {}

  async findAll(query: ProductQueryDto): Promise<PaginationResult<Product>> {
    let firestoreQuery = this.firestore
      .collection('products')
      .orderBy('createdAt', query.order || 'desc');

    // 分類篩選
    if (query.category) {
      firestoreQuery = firestoreQuery.where('category', '==', query.category);
    }

    // 價格篩選
    if (query.minPrice) {
      firestoreQuery = firestoreQuery.where('price', '>=', query.minPrice);
    }
    if (query.maxPrice) {
      firestoreQuery = firestoreQuery.where('price', '<=', query.maxPrice);
    }

    return PaginationHelper.paginate<Product>(firestoreQuery, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  async findById(id: string): Promise<Product> {
    const doc = await this.firestore.collection('products').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('商品不存在');
    }
    return this.mapToEntity(doc);
  }

  async getCategories(): Promise<string[]> {
    const snapshot = await this.firestore.collection('products').get();
    const categories = new Set<string>();
    snapshot.docs.forEach(doc => categories.add(doc.data().category));
    return Array.from(categories);
  }

  private mapToEntity(doc: FirebaseFirestore.DocumentSnapshot): Product {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      stock: data.stock,
      imageUrl: data.imageUrl,
      createdAt: data.createdAt?.toDate(),
    };
  }
}
```

**Service 層**：
```typescript
@Injectable()
export class ProductsService {
  constructor(private readonly productsRepo: ProductsRepository) {}

  async findAll(query: ProductQueryDto) {
    return this.productsRepo.findAll(query);
  }

  async findOne(id: string) {
    return this.productsRepo.findById(id);
  }

  async getCategories() {
    return this.productsRepo.getCategories();
  }
}
```

**查詢 DTO**：
```typescript
export class ProductQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsEnum(['price', 'createdAt'])
  orderBy?: string;
}
```

**驗證**：
```bash
# 取得所有商品
curl http://localhost:8080/api/products

# 篩選電子產品
curl http://localhost:8080/api/products?category=electronics

# 價格區間篩選
curl http://localhost:8080/api/products?minPrice=1000&maxPrice=5000

# 取得分類
curl http://localhost:8080/api/products/categories

# 取得單一商品
curl http://localhost:8080/api/products/{productId}
```

---

### 3. 實現會員模組 - 基礎 CRUD（Members Module）
- [ ] 創建 `src/members/members.module.ts`
- [ ] 創建 `src/members/members.controller.ts`
- [ ] 創建 `src/members/members.service.ts`
- [ ] 創建 `src/members/members.repository.ts`
- [ ] 創建 `src/members/entities/member.entity.ts`
- [ ] 創建管理員用的 CRUD 端點

**API 端點（管理員用）**：
```
GET    /api/admin/members        # 取得所有會員（支援篩選）
POST   /api/admin/members        # 建立會員
GET    /api/admin/members/:id    # 取得單一會員
PUT    /api/admin/members/:id    # 更新會員
DELETE /api/admin/members/:id    # 刪除會員（軟刪除）
PATCH  /api/admin/members/:id/toggle-status  # 切換啟用狀態
PATCH  /api/admin/members/:id/password       # 更新密碼
```

**Repository 實作**：
```typescript
@Injectable()
export class MembersRepository {
  constructor(@Inject('FIRESTORE') private firestore: Firestore) {}

  async findAll(query: MemberQueryDto): Promise<PaginationResult<Member>> {
    let firestoreQuery = this.firestore.collection('members');

    // 預設排除已刪除的會員
    if (!query.includeDeleted) {
      firestoreQuery = firestoreQuery.where('deletedAt', '==', null);
    }

    // 啟用狀態篩選
    if (query.isActive !== undefined) {
      firestoreQuery = firestoreQuery.where('isActive', '==', query.isActive);
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

    firestoreQuery = firestoreQuery.orderBy('createdAt', query.order || 'desc');

    return PaginationHelper.paginate<Member>(firestoreQuery, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  async findById(id: string): Promise<Member> {
    const doc = await this.firestore.collection('members').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('會員不存在');
    }
    return this.mapToEntity(doc);
  }

  async create(uid: string, data: CreateMemberDto): Promise<Member> {
    const memberData = {
      email: data.email,
      name: data.name,
      phone: data.phone || null,
      isActive: true,
      deletedAt: null,
      deletedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await this.firestore.collection('members').doc(uid).set(memberData);
    return this.findById(uid);
  }

  async update(id: string, data: UpdateMemberDto): Promise<Member> {
    await this.firestore.collection('members').doc(id).update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return this.findById(id);
  }

  async delete(id: string, deletedBy: string): Promise<void> {
    await this.firestore.collection('members').doc(id).update({
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async toggleStatus(id: string): Promise<Member> {
    const member = await this.findById(id);
    await this.firestore.collection('members').doc(id).update({
      isActive: !member.isActive,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return this.findById(id);
  }

  private mapToEntity(doc: FirebaseFirestore.DocumentSnapshot): Member {
    const data = doc.data();
    return {
      id: doc.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
      isActive: data.isActive,
      deletedAt: data.deletedAt?.toDate() || null,
      deletedBy: data.deletedBy,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }
}
```

**Service 整合 Firebase Auth**：
```typescript
@Injectable()
export class MembersService {
  constructor(
    private readonly membersRepo: MembersRepository,
    @Inject('FIREBASE_APP') private firebaseApp: admin.app.App,
  ) {}

  async create(dto: CreateMemberDto) {
    // 1. 建立 Firebase Auth 用戶
    const userRecord = await this.firebaseApp.auth().createUser({
      email: dto.email,
      password: dto.password,
      displayName: dto.name,
    });

    // 2. 設定 Custom Claims
    await this.firebaseApp.auth().setCustomUserClaims(userRecord.uid, {
      member: true,
    });

    // 3. 建立 Firestore document
    return this.membersRepo.create(userRecord.uid, dto);
  }

  async update(id: string, dto: UpdateMemberDto) {
    // 更新 Firestore
    await this.membersRepo.update(id, dto);

    // 如果更新 email 或 displayName，也更新 Firebase Auth
    if (dto.email || dto.name) {
      await this.firebaseApp.auth().updateUser(id, {
        email: dto.email,
        displayName: dto.name,
      });
    }

    return this.membersRepo.findById(id);
  }

  async updatePassword(id: string, dto: UpdatePasswordDto) {
    await this.firebaseApp.auth().updateUser(id, {
      password: dto.password,
    });
    return { message: '密碼更新成功' };
  }

  async delete(id: string, deletedBy: string) {
    // 軟刪除 Firestore
    await this.membersRepo.delete(id, deletedBy);

    // 停用 Firebase Auth（不刪除）
    await this.firebaseApp.auth().updateUser(id, { disabled: true });

    return { message: '會員已刪除' };
  }
}
```

**驗證**：
```bash
# 取得會員列表
curl -H "Authorization: Bearer {admin_token}" \
  http://localhost:8080/api/admin/members

# 建立會員
curl -X POST -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","password":"qwer1234","name":"新會員"}' \
  http://localhost:8080/api/admin/members

# 更新會員
curl -X PUT -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"name":"更新名稱"}' \
  http://localhost:8080/api/admin/members/{memberId}

# 刪除會員
curl -X DELETE -H "Authorization: Bearer {admin_token}" \
  http://localhost:8080/api/admin/members/{memberId}
```

---

### 4. 實現會員軟刪除功能（deletedAt、deletedBy）
- [ ] 確保 Repository 查詢預設排除 deletedAt 不為 null 的資料
- [ ] 實作 `restore` 端點恢復已刪除會員
- [ ] 實作 `includeDeleted` 查詢參數

**恢復功能**：
```typescript
async restore(id: string) {
  const member = await this.membersRepo.findById(id);

  if (!member.deletedAt) {
    throw new BadRequestException('會員未被刪除');
  }

  // 恢復 Firestore
  await this.firestore.collection('members').doc(id).update({
    deletedAt: null,
    deletedBy: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 恢復 Firebase Auth
  await this.firebaseApp.auth().updateUser(id, { disabled: false });

  return { message: '會員已恢復' };
}
```

**API 端點**：
```
POST /api/admin/members/:id/restore
```

**驗證**：
```bash
# 恢復已刪除的會員
curl -X POST -H "Authorization: Bearer {admin_token}" \
  http://localhost:8080/api/admin/members/{memberId}/restore

# 查看包含已刪除的會員
curl -H "Authorization: Bearer {admin_token}" \
  http://localhost:8080/api/admin/members?includeDeleted=true
```

---

### 5. 實現會員個人資料 API（Member Profile）
- [ ] 創建 `src/members/profile.controller.ts`
- [ ] 實作取得自己的資料
- [ ] 實作更新自己的資料
- [ ] 使用 `@CurrentUser()` decorator

**API 端點**：
```
GET /api/member           # 取得自己的會員資料
PUT /api/member           # 更新自己的會員資料
```

**Controller 實作**：
```typescript
@Controller('api/member')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('member')
export class MemberProfileController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  async getProfile(@CurrentUser() user: DecodedIdToken) {
    return this.membersService.findById(user.uid);
  }

  @Put()
  async updateProfile(
    @CurrentUser() user: DecodedIdToken,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.membersService.update(user.uid, dto);
  }
}
```

**CurrentUser Decorator**：
```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

**驗證**：
```bash
# 取得自己的資料
curl -H "Authorization: Bearer {member_token}" \
  http://localhost:8080/api/member

# 更新自己的資料
curl -X PUT -H "Authorization: Bearer {member_token}" \
  -H "Content-Type: application/json" \
  -d '{"name":"新名稱","phone":"0912345678"}' \
  http://localhost:8080/api/member
```

---

### 6. 建立 DTO 和 Validation Pipes（取代 express-validator）
- [ ] 安裝 `class-validator` 和 `class-transformer`
- [ ] 創建所有模組的 DTO
- [ ] 在 main.ts 啟用全域 ValidationPipe
- [ ] 創建自訂驗證器（如 IsFirebaseUID）

**全域 ValidationPipe**：
```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // 自動移除未定義的屬性
    forbidNonWhitelisted: true, // 如果有未定義的屬性，拋出錯誤
    transform: true,            // 自動轉換型別
    transformOptions: {
      enableImplicitConversion: true, // 啟用隱式轉換（query params）
    },
  }),
);
```

**自訂驗證器範例**：
```typescript
@ValidatorConstraint({ name: 'IsFirebaseUID', async: false })
export class IsFirebaseUIDConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    return typeof value === 'string' && /^[a-zA-Z0-9]{28}$/.test(value);
  }

  defaultMessage() {
    return 'Invalid Firebase UID format';
  }
}

export function IsFirebaseUID(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFirebaseUIDConstraint,
    });
  };
}
```

**DTO 範例集合**：
```typescript
// 分頁 DTO
export class PaginationDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

// 會員查詢 DTO
export class MemberQueryDto extends PaginationDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeDeleted?: boolean;

  @IsOptional()
  @IsISO8601()
  minCreatedAt?: string;

  @IsOptional()
  @IsISO8601()
  maxCreatedAt?: string;
}
```

**驗證**：
```bash
# 測試驗證錯誤
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"123"}'
# 應該回傳驗證錯誤訊息
```

---

## 🎯 Phase 2 完成標準

完成以下所有項目後，視為 Phase 2 完成：

- ✅ 會員可以成功註冊和登入
- ✅ 管理員可以登入並取得 Token
- ✅ 商品 API 能正常查詢（分頁、篩選、分類）
- ✅ 管理員能對會員進行完整 CRUD 操作
- ✅ 軟刪除功能正常運作
- ✅ 會員能查看和更新自己的資料
- ✅ 所有 DTO 驗證正常運作

---

## 📝 測試清單

```bash
# === 認證測試 ===
# 1. 會員註冊
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"qwer1234","name":"測試用戶"}'

# 2. 會員登入
curl -X POST http://localhost:8080/api/auth/member/signInWithPassword \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"qwer1234"}'

# === 商品測試 ===
# 3. 取得商品列表
curl http://localhost:8080/api/products

# 4. 篩選商品
curl "http://localhost:8080/api/products?category=electronics&minPrice=1000"

# 5. 取得分類
curl http://localhost:8080/api/products/categories

# === 會員管理測試（需要管理員 Token）===
# 6. 取得會員列表
curl -H "Authorization: Bearer {admin_token}" \
  http://localhost:8080/api/admin/members

# 7. 建立會員
curl -X POST -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","password":"qwer1234","name":"新會員"}' \
  http://localhost:8080/api/admin/members

# 8. 軟刪除會員
curl -X DELETE -H "Authorization: Bearer {admin_token}" \
  http://localhost:8080/api/admin/members/{memberId}

# 9. 恢復會員
curl -X POST -H "Authorization: Bearer {admin_token}" \
  http://localhost:8080/api/admin/members/{memberId}/restore

# === 會員個人資料測試（需要會員 Token）===
# 10. 取得自己的資料
curl -H "Authorization: Bearer {member_token}" \
  http://localhost:8080/api/member

# 11. 更新自己的資料
curl -X PUT -H "Authorization: Bearer {member_token}" \
  -H "Content-Type: application/json" \
  -d '{"name":"更新名稱"}' \
  http://localhost:8080/api/member
```

---

## 🔄 下一步

Phase 2 完成並測試通過後，進入 **Phase 3 - 後期階段**，完成剩餘功能（管理員、訂單、郵件、測試）。
