import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { AdminsRepository } from '../repositories/admins.repository';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { AdminQueryDto } from '../dto/admin-query.dto';
import { Admin } from '../entities/admin.entity';
import { PaginationResult } from '../../common/pagination/pagination.interface';

@Injectable()
export class AdminsAdminService {
  constructor(
    @Inject('FIREBASE_AUTH') private readonly auth: admin.auth.Auth,
    private readonly adminsRepo: AdminsRepository,
  ) {}

  /**
   * 建立管理員（同時建立 Firebase Auth 帳號）
   * 流程：
   * 1. 檢查 email 是否已存在
   * 2. 在 Firebase Auth 建立用戶
   * 3. 設定 Custom Claims (admin: true)
   * 4. 在 Firestore 建立管理員記錄
   * 5. 如果 Firestore 操作失敗，回滾 Auth 帳號
   */
  async createAdmin(dto: CreateAdminDto): Promise<Admin> {
    // 1. 檢查 email 是否已存在
    const emailExists = await this.adminsRepo.emailExists(dto.email);
    if (emailExists) {
      throw new ConflictException('此電子郵件已被使用');
    }

    // 2. 在 Firebase Auth 建立用戶
    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await this.auth.createUser({
        email: dto.email,
        password: dto.password,
        displayName: dto.name,
        emailVerified: false,
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        throw new ConflictException('此電子郵件已被使用');
      }
      throw new BadRequestException(`建立 Auth 帳號失敗: ${error.message}`);
    }

    try {
      // 3. 設定 Custom Claims
      await this.auth.setCustomUserClaims(userRecord.uid, { admin: true });

      // 4. 在 Firestore 建立管理員記錄
      const admin = await this.adminsRepo.create(userRecord.uid, {
        email: dto.email,
        name: dto.name,
        isActive: true,
        deletedAt: null,
        deletedBy: null,
      });

      return admin;
    } catch (error) {
      // 如果 Firestore 操作失敗，回滾：刪除 Auth 帳號
      await this.auth.deleteUser(userRecord.uid);
      throw new BadRequestException(`建立管理員記錄失敗: ${error.message}`);
    }
  }

  /**
   * 查詢管理員列表
   * 支援分頁、篩選、排序、軟刪除包含選項
   */
  async getAdmins(query: AdminQueryDto): Promise<PaginationResult<Admin>> {
    return this.adminsRepo.findAll(query);
  }

  /**
   * 取得單一管理員詳情
   * 可選擇是否包含已刪除的管理員
   */
  async getAdmin(uid: string, options?: { includeDeleted?: boolean }): Promise<Admin> {
    const admin = await this.adminsRepo.findById(uid, options);
    if (!admin) {
      throw new NotFoundException(`找不到管理員 ID: ${uid}`);
    }
    return admin;
  }

  /**
   * 更新管理員基本資料
   * 可更新 name
   */
  async updateAdmin(uid: string, dto: UpdateAdminDto): Promise<Admin> {
    // 檢查管理員是否存在
    const admin = await this.adminsRepo.findById(uid);
    if (!admin) {
      throw new NotFoundException(`找不到管理員 ID: ${uid}`);
    }

    // 檢查是否已被刪除
    if (admin.deletedAt) {
      throw new BadRequestException('無法更新已刪除的管理員');
    }

    return this.adminsRepo.update(uid, dto);
  }

  /**
   * 軟刪除管理員
   * 流程：
   * 1. 檢查管理員是否存在
   * 2. 設定 Firestore 的 deletedAt 和 deletedBy
   * 3. 設定 isActive = false
   * 4. 禁用 Firebase Auth 帳號（disabled = true）
   */
  async deleteAdmin(uid: string, adminUid: string): Promise<Admin> {
    // 檢查管理員是否存在
    const admin = await this.adminsRepo.findById(uid);
    if (!admin) {
      throw new NotFoundException(`找不到管理員 ID: ${uid}`);
    }

    // 檢查是否已被刪除
    if (admin.deletedAt) {
      throw new BadRequestException('管理員已被刪除');
    }

    // 軟刪除 Firestore 記錄
    const deletedAdmin = await this.adminsRepo.softDelete(uid, adminUid);

    // 禁用 Firebase Auth 帳號
    try {
      await this.auth.updateUser(uid, { disabled: true });
    } catch (error) {
      // 如果禁用 Auth 失敗，不影響軟刪除操作
      console.error(`禁用 Auth 帳號失敗: ${error.message}`);
    }

    return deletedAdmin;
  }

  /**
   * 恢復已軟刪除的管理員
   * 流程：
   * 1. 檢查管理員是否存在且已刪除
   * 2. 清除 Firestore 的 deletedAt 和 deletedBy
   * 3. 設定 isActive = true
   * 4. 啟用 Firebase Auth 帳號（disabled = false）
   */
  async restoreAdmin(uid: string): Promise<Admin> {
    // 檢查管理員是否存在（包含已刪除）
    const admin = await this.adminsRepo.findById(uid, { includeDeleted: true });
    if (!admin) {
      throw new NotFoundException(`找不到管理員 ID: ${uid}`);
    }

    // 檢查是否已被刪除
    if (!admin.deletedAt) {
      throw new BadRequestException('管理員未被刪除，無需恢復');
    }

    // 恢復 Firestore 記錄
    const restoredAdmin = await this.adminsRepo.restore(uid);

    // 啟用 Firebase Auth 帳號
    try {
      await this.auth.updateUser(uid, { disabled: false });
    } catch (error) {
      // 如果啟用 Auth 失敗，不影響恢復操作
      console.error(`啟用 Auth 帳號失敗: ${error.message}`);
    }

    return restoredAdmin;
  }

  /**
   * 切換管理員啟用/停用狀態
   * 不同於軟刪除：停用只是禁止登入，記錄仍保留
   */
  async toggleStatus(uid: string): Promise<Admin> {
    // 檢查管理員是否存在
    const admin = await this.adminsRepo.findById(uid);
    if (!admin) {
      throw new NotFoundException(`找不到管理員 ID: ${uid}`);
    }

    // 檢查是否已被刪除
    if (admin.deletedAt) {
      throw new BadRequestException('無法切換已刪除管理員的狀態');
    }

    // 切換 Firestore 狀態
    const updatedAdmin = await this.adminsRepo.toggleStatus(uid);

    // 同步更新 Firebase Auth 帳號狀態
    try {
      await this.auth.updateUser(uid, { disabled: !updatedAdmin.isActive });
    } catch (error) {
      console.error(`更新 Auth 帳號狀態失敗: ${error.message}`);
    }

    return updatedAdmin;
  }

  /**
   * 賦予現有 Firebase Auth 帳號管理員角色
   * 將已存在的 Firebase Auth 用戶添加到 admins 集合
   *
   * 流程：
   * 1. 檢查該 UID 是否已在 admins 表中存在
   * 2. 驗證 Firebase Auth 中該 UID 是否存在
   * 3. 從 Auth 獲取用戶資訊（email 必須存在）
   * 4. 設定 Custom Claims (admin: true)
   * 5. 在 Firestore 建立管理員記錄
   * 6. 如果 Firestore 操作失敗，回滾 Custom Claims
   *
   * @param uid - Firebase Auth UID
   * @param name - 管理員名稱
   * @returns 創建的管理員記錄
   * @throws ConflictException - 該帳號已經是管理員
   * @throws NotFoundException - Firebase Auth 中找不到該 UID
   * @throws BadRequestException - Auth 帳號沒有 Email
   * @throws InternalServerErrorException - 設定權限或創建記錄失敗
   */
  async createAdminRole(uid: string, name: string): Promise<Admin> {
    // 1. 檢查該 uid 是否已在 admins 表中存在（包含已刪除的）
    const existingAdmin = await this.adminsRepo.findById(uid, {
      includeDeleted: true,
    });

    if (existingAdmin) {
      throw new ConflictException('該帳號已經賦予管理員角色');
    }

    // 2. 驗證 Firebase Auth 中該 uid 是否存在，並獲取用戶資訊
    let authUser: admin.auth.UserRecord;
    try {
      authUser = await this.auth.getUser(uid);
    } catch (error) {
      throw new NotFoundException(`找不到 UID: ${uid} 的 Firebase Auth 帳號`);
    }

    // 3. 從 Auth 獲取 email（必須存在）
    if (!authUser.email) {
      throw new BadRequestException('該 Firebase Auth 帳號沒有電子郵件地址');
    }

    // 4. 設定 Custom Claims
    try {
      await this.auth.setCustomUserClaims(uid, { admin: true });
    } catch (error) {
      throw new InternalServerErrorException('設定管理員權限失敗');
    }

    // 5. 在 Firestore 建立管理員記錄
    try {
      const admin = await this.adminsRepo.create(uid, {
        email: authUser.email,
        name: name,
        isActive: !authUser.disabled, // 根據 Auth 的 disabled 狀態設定
      });

      return admin;
    } catch (error) {
      // 如果 Firestore 創建失敗，回滾 Custom Claims
      try {
        await this.auth.setCustomUserClaims(uid, { admin: false });
      } catch (rollbackError) {
        console.error(`回滾 Custom Claims 失敗: ${rollbackError.message}`);
      }
      throw new InternalServerErrorException('創建管理員記錄失敗');
    }
  }
}
