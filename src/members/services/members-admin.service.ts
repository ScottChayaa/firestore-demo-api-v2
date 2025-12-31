import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { MembersRepository } from '../repositories/members.repository';
import { CreateMemberDto } from '../dto/create-member.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import { MemberQueryDto } from '../dto/member-query.dto';
import { Member } from '../entities/member.entity';
import { PaginationResult } from '../../common/pagination/pagination.interface';

@Injectable()
export class MembersAdminService {
  constructor(
    @Inject('FIREBASE_AUTH') private readonly auth: admin.auth.Auth,
    private readonly membersRepo: MembersRepository,
  ) {}

  /**
   * 建立會員（同時建立 Firebase Auth 帳號）
   * 流程：
   * 1. 檢查 email 是否已存在
   * 2. 在 Firebase Auth 建立用戶
   * 3. 設定 Custom Claims (member: true)
   * 4. 在 Firestore 建立會員記錄
   * 5. 如果 Firestore 操作失敗，回滾 Auth 帳號
   */
  async createMember(dto: CreateMemberDto): Promise<Member> {
    // 1. 檢查 email 是否已存在
    const emailExists = await this.membersRepo.emailExists(dto.email);
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
      await this.auth.setCustomUserClaims(userRecord.uid, { member: true });

      // 4. 在 Firestore 建立會員記錄
      const member = await this.membersRepo.create(userRecord.uid, {
        email: dto.email,
        name: dto.name,
        phone: dto.phone || null,
        isActive: true,
        deletedAt: null,
        deletedBy: null,
      });

      return member;
    } catch (error) {
      // 如果 Firestore 操作失敗，回滾：刪除 Auth 帳號
      await this.auth.deleteUser(userRecord.uid);
      throw new BadRequestException(`建立會員記錄失敗: ${error.message}`);
    }
  }

  /**
   * 查詢會員列表
   * 支援分頁、篩選、排序、軟刪除包含選項
   */
  async getMembers(query: MemberQueryDto): Promise<PaginationResult<Member>> {
    return this.membersRepo.findAll(query);
  }

  /**
   * 取得單一會員詳情
   * 可選擇是否包含已刪除的會員
   */
  async getMember(uid: string, options?: { includeDeleted?: boolean }): Promise<Member> {
    const member = await this.membersRepo.findById(uid, options);
    if (!member) {
      throw new NotFoundException(`找不到會員 ID: ${uid}`);
    }
    return member;
  }

  /**
   * 更新會員基本資料
   * 可更新 name 和 phone
   */
  async updateMember(uid: string, dto: UpdateMemberDto): Promise<Member> {
    // 檢查會員是否存在
    const member = await this.membersRepo.findById(uid);
    if (!member) {
      throw new NotFoundException(`找不到會員 ID: ${uid}`);
    }

    // 檢查是否已被刪除
    if (member.deletedAt) {
      throw new BadRequestException('無法更新已刪除的會員');
    }

    return this.membersRepo.update(uid, dto);
  }

  /**
   * 更新會員密碼
   * 直接更新 Firebase Auth 密碼
   */
  async updatePassword(uid: string, newPassword: string): Promise<void> {
    // 檢查會員是否存在
    const member = await this.membersRepo.findById(uid);
    if (!member) {
      throw new NotFoundException(`找不到會員 ID: ${uid}`);
    }

    // 檢查是否已被刪除
    if (member.deletedAt) {
      throw new BadRequestException('無法更新已刪除會員的密碼');
    }

    try {
      await this.auth.updateUser(uid, { password: newPassword });
    } catch (error) {
      throw new BadRequestException(`更新密碼失敗: ${error.message}`);
    }
  }

  /**
   * 軟刪除會員
   * 流程：
   * 1. 檢查會員是否存在
   * 2. 設定 Firestore 的 deletedAt 和 deletedBy
   * 3. 設定 isActive = false
   * 4. 禁用 Firebase Auth 帳號（disabled = true）
   */
  async deleteMember(uid: string, adminUid: string): Promise<Member> {
    // 檢查會員是否存在
    const member = await this.membersRepo.findById(uid);
    if (!member) {
      throw new NotFoundException(`找不到會員 ID: ${uid}`);
    }

    // 檢查是否已被刪除
    if (member.deletedAt) {
      throw new BadRequestException('會員已被刪除');
    }

    // 軟刪除 Firestore 記錄
    const deletedMember = await this.membersRepo.softDelete(uid, adminUid);

    // 禁用 Firebase Auth 帳號
    try {
      await this.auth.updateUser(uid, { disabled: true });
    } catch (error) {
      // 如果禁用 Auth 失敗，不影響軟刪除操作
      console.error(`禁用 Auth 帳號失敗: ${error.message}`);
    }

    return deletedMember;
  }

  /**
   * 恢復已軟刪除的會員
   * 流程：
   * 1. 檢查會員是否存在且已刪除
   * 2. 清除 Firestore 的 deletedAt 和 deletedBy
   * 3. 設定 isActive = true
   * 4. 啟用 Firebase Auth 帳號（disabled = false）
   */
  async restoreMember(uid: string): Promise<Member> {
    // 檢查會員是否存在（包含已刪除）
    const member = await this.membersRepo.findById(uid, { includeDeleted: true });
    if (!member) {
      throw new NotFoundException(`找不到會員 ID: ${uid}`);
    }

    // 檢查是否已被刪除
    if (!member.deletedAt) {
      throw new BadRequestException('會員未被刪除，無需恢復');
    }

    // 恢復 Firestore 記錄
    const restoredMember = await this.membersRepo.restore(uid);

    // 啟用 Firebase Auth 帳號
    try {
      await this.auth.updateUser(uid, { disabled: false });
    } catch (error) {
      // 如果啟用 Auth 失敗，不影響恢復操作
      console.error(`啟用 Auth 帳號失敗: ${error.message}`);
    }

    return restoredMember;
  }

  /**
   * 切換會員啟用/停用狀態
   * 不同於軟刪除：停用只是禁止登入，記錄仍保留
   */
  async toggleStatus(uid: string): Promise<Member> {
    // 檢查會員是否存在
    const member = await this.membersRepo.findById(uid);
    if (!member) {
      throw new NotFoundException(`找不到會員 ID: ${uid}`);
    }

    // 檢查是否已被刪除
    if (member.deletedAt) {
      throw new BadRequestException('無法切換已刪除會員的狀態');
    }

    // 切換 Firestore 狀態
    const updatedMember = await this.membersRepo.toggleStatus(uid);

    // 同步更新 Firebase Auth 帳號狀態
    try {
      await this.auth.updateUser(uid, { disabled: !updatedMember.isActive });
    } catch (error) {
      console.error(`更新 Auth 帳號狀態失敗: ${error.message}`);
    }

    return updatedMember;
  }

  /**
   * 產生密碼重設連結
   * 使用 Firebase Auth 的密碼重設功能
   */
  async generatePasswordResetLink(uid: string): Promise<string> {
    // 檢查會員是否存在
    const member = await this.membersRepo.findById(uid);
    if (!member) {
      throw new NotFoundException(`找不到會員 ID: ${uid}`);
    }

    // 檢查是否已被刪除
    if (member.deletedAt) {
      throw new BadRequestException('無法為已刪除的會員產生重設連結');
    }

    try {
      const resetLink = await this.auth.generatePasswordResetLink(member.email);
      return resetLink;
    } catch (error) {
      throw new BadRequestException(`產生重設連結失敗: ${error.message}`);
    }
  }
}
