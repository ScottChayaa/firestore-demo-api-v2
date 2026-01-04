import { Injectable, NotFoundException } from '@nestjs/common';
import { MembersRepository } from '../repositories/members.repository';
import { UpdateMemberProfileDto } from '../dto/update-member-profile.dto';
import { Member } from '../entities/member.entity';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

/**
 * 會員個人資料服務
 * 處理會員自己的資料查詢和更新
 */
@Injectable()
export class MemberService {
  constructor(
    private readonly membersRepo: MembersRepository,
    @InjectPinoLogger(MemberService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * 取得會員自己的資料
   * @param uid - 會員 UID（從 JWT token 中取得）
   */
  async getProfile(uid: string): Promise<Member> {
    this.logger.info({ uid }, '會員查詢自己的資料');

    const member = await this.membersRepo.findById(uid);
    if (!member) {
      this.logger.warn({ uid }, '找不到會員資料');
      throw new NotFoundException('找不到會員資料');
    }

    this.logger.info({ uid, email: member.email }, '查詢會員資料成功');
    return member;
  }

  /**
   * 更新會員自己的資料
   * @param uid - 會員 UID（從 JWT token 中取得）
   * @param dto - 更新資料
   */
  async updateProfile(uid: string, dto: UpdateMemberProfileDto): Promise<Member> {
    this.logger.info({ uid, updateData: dto }, '會員更新自己的資料');

    // 檢查會員是否存在
    const member = await this.membersRepo.findById(uid);
    if (!member) {
      this.logger.warn({ uid }, '找不到會員資料');
      throw new NotFoundException('找不到會員資料');
    }

    // 更新資料
    const updatedMember = await this.membersRepo.update(uid, dto);
    this.logger.info({ uid, email: updatedMember.email }, '更新會員資料成功');

    return updatedMember;
  }
}
