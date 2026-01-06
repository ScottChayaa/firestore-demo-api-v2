import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * 測試資料生成腳本
 * 生成商品、會員、訂單、管理員等測試資料
 *
 * 使用方式：
 * npm run seed
 *
 * 環境變數配置：
 * SEED_MEMBERS_COUNT=10     # 會員數量（預設 10）
 * SEED_ORDERS_COUNT=50      # 訂單數量（預設 50）
 * SEED_PRODUCTS_COUNT=10    # 商品數量（預設 10）
 */
async function bootstrap() {
  console.log('🌱 開始生成測試資料...\n');

  // 創建 NestJS Application Context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'], // 只顯示錯誤和警告
  });

  const configService = app.get(ConfigService);

  // 從環境變數讀取數量配置
  const MEMBERS_COUNT = configService.get<number>('seed.membersCount') || 10;
  const ORDERS_COUNT = configService.get<number>('seed.ordersCount') || 50;
  const PRODUCTS_COUNT = configService.get<number>('seed.productsCount') || 10;

  // 獲取 Firebase 實例
  const firebaseApp = app.get<admin.app.App>('FIREBASE_APP');
  const firestore = firebaseApp.firestore();
  const auth = firebaseApp.auth();

  try {
    // 1. 生成商品
    console.log(`📦 生成 ${PRODUCTS_COUNT} 筆商品...`);
    const categories = ['electronics', 'clothing', 'food', 'books', 'sports'];
    const products: Array<{ id: string; name: string; price: number }> = [];

    for (let i = 1; i <= PRODUCTS_COUNT; i++) {
      const category =
        categories[Math.floor(Math.random() * categories.length)];
      const price = Math.floor(Math.random() * 5000) + 500;
      const product = {
        name: `商品 ${i}`,
        description: `這是商品 ${i} 的詳細描述`,
        price,
        category,
        stock: Math.floor(Math.random() * 100) + 10,
        imageUrl: `https://picsum.photos/400/300?random=${i}`,
        isActive: Math.random() > 0.1, // 90% 啟用
        deletedAt: null,
        deletedBy: null,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      const docRef = await firestore.collection('products').add(product);
      products.push({ id: docRef.id, name: product.name, price });
    }
    console.log(`✅ 商品生成完成：${PRODUCTS_COUNT} 筆\n`);

    // 2. 生成會員
    console.log(`👥 生成 ${MEMBERS_COUNT} 筆會員...`);
    const members: Array<{ id: string; email: string; name: string }> = [];

    for (let i = 1; i <= MEMBERS_COUNT; i++) {
      const email = `member${i}@example.com`;
      const password = 'qwer1234';
      const name = `會員${i}`;

      try {
        // 建立 Firebase Auth 用戶
        const userRecord = await auth.createUser({
          email,
          password,
          displayName: name,
        });

        // 設定 Custom Claims
        await auth.setCustomUserClaims(userRecord.uid, { member: true });

        // 建立 Firestore document
        const memberData = {
          email,
          name,
          phone: `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
          isActive: Math.random() > 0.1, // 90% 啟用
          deletedAt: null,
          deletedBy: null,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        };

        await firestore
          .collection('members')
          .doc(userRecord.uid)
          .set(memberData);
        members.push({ id: userRecord.uid, email, name });

        if (i % 10 === 0) {
          process.stdout.write(`   進度: ${i}/${MEMBERS_COUNT}\r`);
        }
      } catch (error) {
        console.error(`   ⚠️  會員 ${email} 創建失敗: ${error.message}`);
      }
    }
    console.log(`✅ 會員生成完成：${members.length} 筆\n`);

    // 3. 生成訂單
    console.log(`📋 生成 ${ORDERS_COUNT} 筆訂單...`);
    const statuses = ['pending', 'processing', 'completed', 'cancelled'];
    let ordersCreated = 0;

    for (let i = 1; i <= ORDERS_COUNT; i++) {
      const member = members[Math.floor(Math.random() * members.length)];
      const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 個項目
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

      const totalAmount = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      // 生成訂單編號
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 7).toUpperCase();
      const orderNumber = `ORD-${dateStr}-${random}`;

      const orderData = {
        memberId: member.id,
        orderNumber,
        items,
        totalAmount,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await firestore.collection('orders').add(orderData);
      ordersCreated++;

      if (i % 50 === 0) {
        process.stdout.write(`   進度: ${i}/${ORDERS_COUNT}\r`);
      }
    }
    console.log(`✅ 訂單生成完成：${ordersCreated} 筆\n`);

    // 4. 生成管理員
    console.log('👑 生成管理員帳號...');
    const adminEmail = 'admin@example.com';
    const adminPassword = 'qwer1234';
    const adminName = '系統管理員';

    try {
      // 建立 Firebase Auth 用戶
      const adminRecord = await auth.createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: adminName,
      });

      // 設定 Custom Claims
      await auth.setCustomUserClaims(adminRecord.uid, { admin: true });

      // 建立 Firestore document
      await firestore
        .collection('admins')
        .doc(adminRecord.uid)
        .set({
          email: adminEmail,
          name: adminName,
          isActive: true,
          deletedAt: null,
          deletedBy: null,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

      console.log(`✅ 管理員帳號創建成功\n`);
    } catch (error) {
      console.error(`⚠️  管理員帳號創建失敗: ${error.message}\n`);
    }

    // 5. 顯示摘要
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 測試資料生成完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 商品:     ${PRODUCTS_COUNT} 筆`);
    console.log(`👥 會員:     ${members.length} 筆`);
    console.log(`📋 訂單:     ${ordersCreated} 筆`);
    console.log(`👑 管理員:   1 筆`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n登入資訊：');
    console.log(`  管理員: ${adminEmail}`);
    console.log(`  密碼:   ${adminPassword}`);
    console.log(`  會員:   member1@example.com ~ member${MEMBERS_COUNT}@example.com`);
    console.log(`  密碼:   qwer1234`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ 發生錯誤:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
