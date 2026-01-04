import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import * as admin from 'firebase-admin';

/**
 * Firebase Auth 清理腳本
 * 刪除所有 Firebase Authentication 用戶
 *
 * 使用方式：
 * npm run clean:auth
 *
 * ⚠️  警告：此操作不可逆，會刪除所有用戶！
 */
async function cleanAuth() {
  console.log('🧹 開始清理 Firebase Auth...\n');

  // 創建 NestJS Application Context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  // 獲取 Firebase Auth 實例
  const firebaseApp = app.get<admin.app.App>('FIREBASE_APP');
  const auth = firebaseApp.auth();

  try {
    // 列出所有用戶
    console.log('📋 正在列出所有用戶...');
    const listUsersResult = await auth.listUsers();
    const totalUsers = listUsersResult.users.length;

    if (totalUsers === 0) {
      console.log('ℹ️  沒有用戶需要刪除\n');
      await app.close();
      return;
    }

    console.log(`👥 找到 ${totalUsers} 個用戶\n`);
    console.log('🗑️  開始刪除用戶...');

    let deletedCount = 0;
    const uids = listUsersResult.users.map((user) => user.uid);

    // 使用批次刪除（每批最多 1000 個）
    const batchSize = 1000;
    for (let i = 0; i < uids.length; i += batchSize) {
      const batch = uids.slice(i, i + batchSize);

      try {
        const result = await auth.deleteUsers(batch);
        deletedCount += result.successCount;

        if (result.failureCount > 0) {
          console.warn(
            `   ⚠️  批次 ${Math.floor(i / batchSize) + 1}: ${result.failureCount} 個用戶刪除失敗`,
          );
          result.errors.forEach((err) => {
            console.warn(`      - UID ${err.index}: ${err.error.message}`);
          });
        }

        process.stdout.write(
          `   進度: ${Math.min(i + batchSize, totalUsers)}/${totalUsers}\r`,
        );
      } catch (error) {
        console.error(`   ❌ 批次刪除失敗:`, error.message);
      }
    }

    console.log('\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Firebase Auth 清理完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👥 總用戶數:   ${totalUsers} 個`);
    console.log(`✅ 成功刪除:   ${deletedCount} 個`);
    console.log(`❌ 刪除失敗:   ${totalUsers - deletedCount} 個`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ 清理過程中發生錯誤:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

cleanAuth();
