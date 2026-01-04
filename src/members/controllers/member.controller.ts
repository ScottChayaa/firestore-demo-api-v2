import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MemberService } from '../services/member.service';
import { UpdateMemberProfileDto } from '../dto/update-member-profile.dto';
import { Member } from '../entities/member.entity';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as admin from 'firebase-admin';

/**
 * 會員個人資料 Controller
 * 路徑：/api/member
 * 權限：需要 member 角色
 */
@Controller('member')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('member')
export class MemberController {
  constructor(
    private readonly memberService: MemberService,
    @InjectPinoLogger(MemberController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * GET /api/member
   * 取得自己的會員資料
   */
  @Get()
  async getProfile(
    @CurrentUser() user: admin.auth.DecodedIdToken,
  ): Promise<Member> {
    this.logger.info({ uid: user.uid }, '會員查詢自己的資料請求');
    const member = await this.memberService.getProfile(user.uid);
    this.logger.info({ uid: user.uid, email: member.email }, '查詢成功');
    return member;
  }

  /**
   * PUT /api/member
   * 更新自己的會員資料
   */
  @Put()
  async updateProfile(
    @CurrentUser() user: admin.auth.DecodedIdToken,
    @Body() dto: UpdateMemberProfileDto,
  ): Promise<Member> {
    this.logger.info({ uid: user.uid, updateData: dto }, '會員更新自己的資料請求');
    const member = await this.memberService.updateProfile(user.uid, dto);
    this.logger.info({ uid: user.uid, email: member.email }, '更新成功');
    return member;
  }
}
