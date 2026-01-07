import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StorageService } from '../storage.service';
import { GenerateUploadUrlDto } from '../dto/generate-upload-url.dto';
import { DeleteFileDto } from '../dto/delete-file.dto';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Controller('storage')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('admin')
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    @InjectPinoLogger(StorageController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * POST /api/storage/generate-upload-url
   * 生成上傳用的 Signed URL
   */
  @Post('generate-upload-url')
  @HttpCode(HttpStatus.OK)
  async generateUploadUrl(@Body() dto: GenerateUploadUrlDto) {
    this.logger.info(
      { fileName: dto.fileName, category: dto.category },
      '生成上傳 URL 請求',
    );
    const result = await this.storageService.generateUploadUrl(dto);
    this.logger.info({ filePath: result.filePath }, '生成上傳 URL 成功');
    return result;
  }

  /**
   * DELETE /api/storage/files
   * 刪除檔案
   */
  @Delete('files')
  @HttpCode(HttpStatus.OK)
  async deleteFile(@Body() dto: DeleteFileDto) {
    this.logger.info({ filePath: dto.filePath }, '刪除檔案請求');
    await this.storageService.deleteFile(dto.filePath);
    this.logger.info({ filePath: dto.filePath }, '刪除檔案成功');
    return {
      message: '檔案已刪除',
      filePath: dto.filePath,
    };
  }
}
