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
import { AdminsAdminService } from '../services/admins-admin.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { AdminQueryDto } from '../dto/admin-query.dto';
import { AssignAdminRoleDto } from '../dto/assign-admin-role.dto';
import { Admin } from '../entities/admin.entity';
import { PaginationResult } from '../../common/pagination/pagination.interface';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as admin from 'firebase-admin';

@Controller('admin/admins')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('admin')
export class AdminsAdminController {
  constructor(
    private readonly adminsAdminService: AdminsAdminService,
    @InjectPinoLogger(AdminsAdminController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * GET /api/admin/admins
   * 查詢管理員列表（分頁、篩選、排序、軟刪除包含選項）
   */
  @Get()
  async getAdmins(@Query() query: AdminQueryDto): Promise<PaginationResult<Admin>> {
    this.logger.info({ query }, '查詢管理員列表請求');
    const result = await this.adminsAdminService.getAdmins(query);
    this.logger.info({ count: result.data.length }, '查詢管理員列表成功');
    return result;
  }

  /**
   * POST /api/admin/admins
   * 建立管理員（同時建立 Firebase Auth 帳號）
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAdmin(@Body() dto: CreateAdminDto) {
    this.logger.info({ email: dto.email }, '建立管理員請求');
    const admin = await this.adminsAdminService.createAdmin(dto);
    this.logger.info({ uid: admin.id, email: admin.email }, '建立管理員成功');
    return {
      message: '管理員建立成功',
      uid: admin.id,
      email: admin.email,
    };
  }

  /**
   * GET /api/admin/admins/:id
   * 取得單一管理員詳情
   */
  @Get(':id')
  async getAdmin(
    @Param('id') id: string,
    @Query('includeDeleted') includeDeleted?: string,
  ): Promise<Admin> {
    this.logger.info({ adminId: id, includeDeleted }, '取得單一管理員請求');
    const admin = await this.adminsAdminService.getAdmin(id, {
      includeDeleted: includeDeleted === 'true',
    });
    this.logger.info({ adminId: id }, '取得單一管理員成功');
    return admin;
  }

  /**
   * PUT /api/admin/admins/:id
   * 更新管理員基本資料
   */
  @Put(':id')
  async updateAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateAdminDto,
  ): Promise<Admin> {
    this.logger.info({ adminId: id, updateData: dto }, '更新管理員資料請求');
    const admin = await this.adminsAdminService.updateAdmin(id, dto);
    this.logger.info({ adminId: id }, '更新管理員資料成功');
    return admin;
  }

  /**
   * DELETE /api/admin/admins/:id
   * 軟刪除管理員
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteAdmin(
    @Param('id') id: string,
    @CurrentUser() admin: admin.auth.DecodedIdToken,
  ) {
    this.logger.warn({ adminId: id, currentAdminUid: admin.uid }, '軟刪除管理員請求');
    await this.adminsAdminService.deleteAdmin(id, admin.uid);
    this.logger.warn({ adminId: id, currentAdminUid: admin.uid }, '軟刪除管理員成功');
    return {
      message: '管理員已刪除',
    };
  }

  /**
   * POST /api/admin/admins/:id/restore
   * 恢復已軟刪除的管理員
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreAdmin(@Param('id') id: string) {
    this.logger.info({ adminId: id }, '恢復管理員請求');
    await this.adminsAdminService.restoreAdmin(id);
    this.logger.info({ adminId: id }, '恢復管理員成功');
    return {
      message: '管理員已恢復',
    };
  }

  /**
   * PATCH /api/admin/admins/:id/toggle-status
   * 切換管理員啟用/停用狀態
   */
  @Patch(':id/toggle-status')
  async toggleStatus(@Param('id') id: string): Promise<Admin> {
    this.logger.info({ adminId: id }, '切換管理員狀態請求');
    const admin = await this.adminsAdminService.toggleStatus(id);
    this.logger.info(
      { adminId: id, newStatus: admin.isActive },
      '切換管理員狀態成功',
    );
    return admin;
  }

  /**
   * POST /api/admin/admins/assign-role
   * 賦予現有 Firebase Auth 帳號管理員角色
   */
  @Post('assign-role')
  @HttpCode(HttpStatus.CREATED)
  async assignAdminRole(@Body() dto: AssignAdminRoleDto) {
    this.logger.info({ uid: dto.uid, name: dto.name }, '賦予管理員角色請求');
    const admin = await this.adminsAdminService.assignAdminRole(
      dto.uid,
      dto.name,
    );
    this.logger.info({ uid: admin.id, email: admin.email }, '賦予管理員角色成功');
    return {
      message: '管理員角色賦予成功',
      uid: admin.id,
      email: admin.email,
      name: admin.name,
    };
  }
}
