import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MembersAdminService } from '../services/members-admin.service';
import { CreateMemberDto } from '../dto/create-member.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import { MemberQueryDto } from '../dto/member-query.dto';
import { AssignMemberRoleDto } from '../dto/assign-member-role.dto';
import { Member } from '../entities/member.entity';
import { PaginationResult } from '../../common/pagination/pagination.interface';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as admin from 'firebase-admin';

@Controller('admin/members')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('admin')
export class MembersAdminController {
  constructor(
    private readonly membersAdminService: MembersAdminService,
    @InjectPinoLogger(MembersAdminController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * GET /api/admin/members
   * 查詢會員列表（分頁、篩選、排序、軟刪除包含選項）
   */
  @Get()
  async getMembers(@Query() query: MemberQueryDto): Promise<PaginationResult<Member>> {
    this.logger.info({ query }, '查詢會員列表請求');
    const result = await this.membersAdminService.getMembers(query);
    this.logger.info({ count: result.data.length }, '查詢會員列表成功');
    return result;
  }

  /**
   * POST /api/admin/members
   * 建立會員（同時建立 Firebase Auth 帳號）
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMember(@Body() dto: CreateMemberDto) {
    this.logger.info({ email: dto.email }, '建立會員請求');
    const member = await this.membersAdminService.createMember(dto);
    this.logger.info({ uid: member.id, email: member.email }, '建立會員成功');
    return {
      message: '會員建立成功',
      uid: member.id,
      email: member.email,
    };
  }

  /**
   * GET /api/admin/members/:id
   * 取得單一會員詳情
   */
  @Get(':id')
  async getMember(
    @Param('id') id: string,
    @Query('includeDeleted') includeDeleted?: string,
  ): Promise<Member> {
    this.logger.info({ memberId: id, includeDeleted }, '取得單一會員請求');
    const member = await this.membersAdminService.getMember(id, {
      includeDeleted: includeDeleted === 'true',
    });
    this.logger.info({ memberId: id }, '取得單一會員成功');
    return member;
  }

  /**
   * PUT /api/admin/members/:id
   * 更新會員基本資料
   */
  @Put(':id')
  async updateMember(
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ): Promise<Member> {
    this.logger.info({ memberId: id, updateData: dto }, '更新會員資料請求');
    const member = await this.membersAdminService.updateMember(id, dto);
    this.logger.info({ memberId: id }, '更新會員資料成功');
    return member;
  }

  /**
   * PATCH /api/admin/members/:id/password
   * 更新會員密碼
   */
  @Patch(':id/password')
  @HttpCode(HttpStatus.OK)
  async updatePassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
  ) {
    this.logger.info({ memberId: id }, '更新會員密碼請求');
    await this.membersAdminService.updatePassword(id, newPassword);
    this.logger.info({ memberId: id }, '更新會員密碼成功');
    return {
      message: '密碼更新成功',
    };
  }

  /**
   * DELETE /api/admin/members/:id
   * 軟刪除會員
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteMember(
    @Param('id') id: string,
    @CurrentUser() admin: admin.auth.DecodedIdToken,
  ) {
    this.logger.warn({ memberId: id, adminUid: admin.uid }, '軟刪除會員請求');
    await this.membersAdminService.deleteMember(id, admin.uid);
    this.logger.warn({ memberId: id, adminUid: admin.uid }, '軟刪除會員成功');
    return {
      message: '會員已刪除',
    };
  }

  /**
   * POST /api/admin/members/:id/restore
   * 恢復已軟刪除的會員
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreMember(@Param('id') id: string) {
    this.logger.info({ memberId: id }, '恢復會員請求');
    await this.membersAdminService.restoreMember(id);
    this.logger.info({ memberId: id }, '恢復會員成功');
    return {
      message: '會員已恢復',
    };
  }

  /**
   * PATCH /api/admin/members/:id/toggle-status
   * 切換會員啟用/停用狀態
   */
  @Patch(':id/toggle-status')
  async toggleStatus(@Param('id') id: string): Promise<Member> {
    this.logger.info({ memberId: id }, '切換會員狀態請求');
    const member = await this.membersAdminService.toggleStatus(id);
    this.logger.info(
      { memberId: id, newStatus: member.isActive },
      '切換會員狀態成功',
    );
    return member;
  }

  /**
   * POST /api/admin/members/:id/generate-password-reset-link
   * 產生重設密碼連結
   */
  @Post(':id/generate-password-reset-link')
  @HttpCode(HttpStatus.OK)
  async generatePasswordResetLink(@Param('id') id: string) {
    this.logger.info({ memberId: id }, '產生密碼重設連結請求');
    const resetLink = await this.membersAdminService.generatePasswordResetLink(id);
    this.logger.info({ memberId: id }, '產生密碼重設連結成功');
    return {
      resetLink,
    };
  }

  /**
   * POST /api/admin/members/assign-role
   * 賦予現有 Firebase Auth 帳號會員角色
   */
  @Post('assign-role')
  @HttpCode(HttpStatus.CREATED)
  async assignMemberRole(@Body() dto: AssignMemberRoleDto) {
    this.logger.info({ uid: dto.uid, name: dto.name }, '賦予會員角色請求');
    const member = await this.membersAdminService.assignMemberRole(
      dto.uid,
      dto.name,
    );
    this.logger.info({ uid: member.id, email: member.email }, '賦予會員角色成功');
    return {
      message: '會員角色賦予成功',
      uid: member.id,
      email: member.email,
      name: member.name,
    };
  }
}
