import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class SeedService {
  private readonly DEFAULT_PASSWORD = 'qwer1234';

  constructor(
    @Inject('FIREBASE_APP') private firebaseApp: admin.app.App,
    @Inject('FIRESTORE') private firestore: admin.firestore.Firestore,
    private configService: ConfigService,
  ) {}

  /**
   * 執行 seed 功能
   */
  async seed() {
    console.log('🗑️  Clearing existing data...');
    await this.clearExistingData();

    console.log('\n👤 Creating admin...');
    await this.createAdmin('admin@example.com', this.DEFAULT_PASSWORD, 'admin');

    console.log('\n👥 Creating members...');
    const membersCount =
      this.configService.get<number>('seed.membersCount') || 10;

    for (let i = 1; i <= membersCount; i++) {
      const email = `member${i}@example.com`;
      const name = `member${i}`;
      await this.createMember(email, this.DEFAULT_PASSWORD, name);
    }
  }

  /**
   * 清除所有資料（公開方法，供 clear script 使用）
   */
  async clearData() {
    await this.clearExistingData();
  }

  /**
   * 創建管理員
   */
  private async createAdmin(
    email: string,
    password: string,
    name: string,
  ): Promise<void> {
    try {
      // 1. 建立 Firebase Auth 用戶
      const userRecord = await this.firebaseApp.auth().createUser({
        email,
        password,
        displayName: name,
      });

      // 2. 設定 Custom Claims（admin 角色）
      await this.firebaseApp.auth().setCustomUserClaims(userRecord.uid, {
        admin: true,
      });

      // 3. 在 Firestore 建立 admin document
      await this.firestore
        .collection('admins')
        .doc(userRecord.uid)
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

      console.log(`  ✅ ${email}`);
    } catch (error) {
      console.error(`  ❌ Failed to create admin ${email}:`, error.message);
      throw error;
    }
  }

  /**
   * 創建會員
   */
  private async createMember(
    email: string,
    password: string,
    name: string,
  ): Promise<void> {
    try {
      // 1. 建立 Firebase Auth 用戶
      const userRecord = await this.firebaseApp.auth().createUser({
        email,
        password,
        displayName: name,
      });

      // 2. 設定 Custom Claims（member 角色）
      await this.firebaseApp.auth().setCustomUserClaims(userRecord.uid, {
        member: true,
      });

      // 3. 在 Firestore 建立 member document
      await this.firestore
        .collection('members')
        .doc(userRecord.uid)
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

      console.log(`  ✅ ${email}`);
    } catch (error) {
      console.error(`  ❌ Failed to create member ${email}:`, error.message);
      throw error;
    }
  }

  /**
   * 清除現有資料
   */
  private async clearExistingData(): Promise<void> {
    try {
      // 1. 清除所有 Firebase Auth 用戶
      const listUsersResult = await this.firebaseApp.auth().listUsers();
      const deletePromises = listUsersResult.users.map((user) =>
        this.firebaseApp.auth().deleteUser(user.uid),
      );
      await Promise.all(deletePromises);
      console.log(`  ✅ Cleared ${deletePromises.length} Firebase Auth users`);

      // 2. 清除 Firestore admins collection
      const adminsSnapshot = await this.firestore.collection('admins').get();
      const adminsDeletePromises = adminsSnapshot.docs.map((doc) =>
        doc.ref.delete(),
      );
      await Promise.all(adminsDeletePromises);
      console.log(
        `  ✅ Cleared ${adminsDeletePromises.length} documents from admins collection`,
      );

      // 3. 清除 Firestore members collection
      const membersSnapshot = await this.firestore.collection('members').get();
      const membersDeletePromises = membersSnapshot.docs.map((doc) =>
        doc.ref.delete(),
      );
      await Promise.all(membersDeletePromises);
      console.log(
        `  ✅ Cleared ${membersDeletePromises.length} documents from members collection`,
      );
    } catch (error) {
      console.error('  ❌ Failed to clear existing data:', error.message);
      throw error;
    }
  }
}
