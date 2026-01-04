import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import * as admin from 'firebase-admin';

/**
 * Firestore 清理腳本
 * 刪除所有 Firestore 集合中的文檔
 *
 * 使用方式：
 * npm run clean:firestore
 *
 * ⚠️  警告：此操作不可逆，會刪除所有資料！
 */
async function cleanFirestore() {
  console.log('🧹 開始清理 Firestore...\n');

  // 創建 NestJS Application Context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  // 獲取 Firestore 實例
  const firebaseApp = app.get<admin.app.App>('FIREBASE_APP');
  const firestore = firebaseApp.firestore();

  // 定義要清理的集合
  const collections = ['members', 'admins', 'orders', 'products'];

  try {
    for (const collectionName of collections) {
      console.log(`📁 清理集合: ${collectionName}`);
      const snapshot = await firestore.collection(collectionName).get();

      if (snapshot.empty) {
        console.log(`   ℹ️  集合 ${collectionName} 為空，跳過\n`);
        continue;
      }

      // 使用批次操作刪除（Firestore 批次限制 500 筆）
      const batchSize = 500;
      let batch = firestore.batch();
      let count = 0;
      let totalCount = 0;

      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
        totalCount++;

        // 當達到批次大小時，提交批次並創建新批次
        if (count >= batchSize) {
          await batch.commit();
          console.log(`   已刪除 ${totalCount} 筆文檔...`);
          batch = firestore.batch();
          count = 0;
        }
      }

      // 提交剩餘的批次
      if (count > 0) {
        await batch.commit();
      }

      console.log(`   ✅ 集合 ${collectionName}: 已刪除 ${totalCount} 筆文檔\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Firestore 清理完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ 清理過程中發生錯誤:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

cleanFirestore();
