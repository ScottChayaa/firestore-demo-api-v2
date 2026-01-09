import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesAdminService } from '../services/files-admin.service';
import { CreateFileDto } from '../dto/create-file.dto';
import { UpdateFileDto } from '../dto/update-file.dto';
import { AdminFileQueryDto } from '../dto/admin-file-query.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { File } from '../entities/file.entity';
import { PaginationResult } from '../../common/pagination/pagination.interface';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as admin from 'firebase-admin';

/**
 * 檔案管理 Controller
 * 路徑：/api/admin/files
 * 權限：需要 admin 角色
 */
@Controller('admin/files')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('admin')
export class FilesAdminController {
  constructor(
    private readonly filesAdminService: FilesAdminService,
    @InjectPinoLogger(FilesAdminController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * GET /api/admin/files
   * 查詢檔案列表（支援篩選、分頁、包含已刪除）
   */
  @Get()
  async getFiles(
    @Query() query: AdminFileQueryDto,
  ): Promise<PaginationResult<File>> {
    this.logger.info({ query }, '管理員查詢檔案列表請求');
    const result = await this.filesAdminService.getFiles(query);
    this.logger.info({ count: result.data.length }, '查詢檔案列表成功');
    return result;
  }

  /**
   * POST /api/admin/files
   * 建立檔案記錄
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFile(
    @Body() dto: CreateFileDto,
    @CurrentUser() admin: admin.auth.DecodedIdToken,
  ): Promise<File> {
    this.logger.info(
      {
        fileName: dto.fileName,
        category: dto.category,
        uploadedBy: admin.uid,
      },
      '建立檔案記錄請求',
    );
    const file = await this.filesAdminService.createFile(dto, admin.uid);
    this.logger.info(
      { fileId: file.id, fileName: file.fileName },
      '建立檔案記錄成功',
    );
    return file;
  }

  /**
   * GET /api/admin/files/:id
   * 取得單一檔案詳情（可包含已刪除）
   */
  @Get(':id')
  async getFileById(@Param('id') id: string): Promise<File> {
    this.logger.info({ fileId: id }, '查詢單一檔案請求');
    const file = await this.filesAdminService.getFileById(id);
    this.logger.info({ fileId: id, fileName: file.fileName }, '查詢成功');
    return file;
  }

  /**
   * PUT /api/admin/files/:id
   * 更新檔案元數據
   */
  @Put(':id')
  async updateFile(
    @Param('id') id: string,
    @Body() dto: UpdateFileDto,
  ): Promise<File> {
    this.logger.info({ fileId: id, updateData: dto }, '更新檔案元數據請求');
    const file = await this.filesAdminService.updateFile(id, dto);
    this.logger.info({ fileId: id, fileName: file.fileName }, '更新成功');
    return file;
  }

  /**
   * DELETE /api/admin/files/:id
   * 軟刪除檔案
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @Param('id') id: string,
    @CurrentUser() admin: admin.auth.DecodedIdToken,
  ) {
    this.logger.warn({ fileId: id, adminUid: admin.uid }, '軟刪除檔案請求');
    await this.filesAdminService.deleteFile(id, admin.uid);
    this.logger.warn({ fileId: id }, '軟刪除檔案成功');
    return {
      message: '檔案已刪除',
    };
  }

  /**
   * POST /api/admin/files/:id/restore
   * 恢復已刪除檔案
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreFile(@Param('id') id: string) {
    this.logger.info({ fileId: id }, '恢復已刪除檔案請求');
    const file = await this.filesAdminService.restoreFile(id);
    this.logger.info({ fileId: id, fileName: file.fileName }, '恢復成功');
    return {
      message: '檔案已恢復',
      file,
    };
  }

  /**
   * POST /api/admin/files/:id/confirm-upload
   * 確認上傳（將檔案從 temp/ 移到 uploads/）
   */
  @Post(':id/confirm-upload')
  @HttpCode(HttpStatus.OK)
  async confirmUpload(@Param('id') id: string) {
    this.logger.info({ fileId: id }, '確認檔案上傳請求');
    const file = await this.filesAdminService.confirmUpload(id);
    this.logger.info(
      { fileId: id, fileName: file.fileName, filePath: file.filePath },
      '確認上傳成功',
    );
    return {
      message: '檔案已確認上傳',
      file,
    };
  }
}
