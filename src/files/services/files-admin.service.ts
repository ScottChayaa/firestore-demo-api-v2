import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FilesRepository } from '../repositories/files.repository';
import { CreateFileDto } from '../dto/create-file.dto';
import { UpdateFileDto } from '../dto/update-file.dto';
import { AdminFileQueryDto } from '../dto/admin-file-query.dto';
import { File } from '../entities/file.entity';
import { PaginationResult } from '../../common/pagination/pagination.interface';
import { StorageService } from '../../storage/storage.service';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Injectable()
export class FilesAdminService {
  constructor(
    private readonly filesRepo: FilesRepository,
    private readonly storageService: StorageService,
    @InjectPinoLogger(FilesAdminService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * 查詢檔案列表
   * 支援分頁、篩選、排序、軟刪除包含選項
   */
  async getFiles(
    query: AdminFileQueryDto,
  ): Promise<PaginationResult<File>> {
    return this.filesRepo.findAll(query);
  }

  /**
   * 取得單一檔案
   */
  async getFileById(id: string): Promise<File> {
    return this.filesRepo.findById(id, { includeDeleted: true });
  }

  /**
   * 建立檔案記錄（在檔案上傳到 GCS 後呼叫）
   */
  async createFile(dto: CreateFileDto, uploadedBy: string): Promise<File> {
    // 驗證暫存檔案路徑
    if (!dto.tempFilePath.startsWith('temp/')) {
      throw new BadRequestException('檔案路徑必須為暫存區路徑（temp/...）');
    }

    // 建立檔案記錄
    const file = await this.filesRepo.create(
      {
        fileName: dto.fileName,
        originalFileName: dto.originalFileName,
        tempFilePath: dto.tempFilePath,
        cdnUrl: dto.cdnUrl,
        contentType: dto.contentType,
        fileSize: dto.fileSize,
        category: dto.category,
        description: dto.description,
        tags: dto.tags,
      },
      uploadedBy,
    );

    this.logger.info(
      {
        fileId: file.id,
        fileName: file.fileName,
        category: file.category,
        fileSize: file.fileSize,
      },
      '檔案記錄已建立',
    );

    return file;
  }

  /**
   * 更新檔案元數據
   */
  async updateFile(id: string, dto: UpdateFileDto): Promise<File> {
    // 檢查檔案是否存在
    const file = await this.filesRepo.findById(id, { includeDeleted: true });

    // 不能更新已刪除的檔案
    if (file.deletedAt) {
      throw new BadRequestException('無法更新已刪除的檔案');
    }

    // 更新檔案元數據
    const updatedFile = await this.filesRepo.update(id, dto);

    this.logger.info(
      { fileId: id, updateData: dto },
      '檔案元數據已更新',
    );

    return updatedFile;
  }

  /**
   * 軟刪除檔案
   */
  async deleteFile(id: string, adminUid: string): Promise<File> {
    // 檢查檔案是否存在
    const file = await this.filesRepo.findById(id, { includeDeleted: true });

    if (file.deletedAt) {
      throw new BadRequestException('檔案已經被刪除');
    }

    // 軟刪除
    const deletedFile = await this.filesRepo.softDelete(id, adminUid);

    this.logger.warn(
      { fileId: id, fileName: file.fileName, deletedBy: adminUid },
      '檔案已軟刪除',
    );

    return deletedFile;
  }

  /**
   * 恢復已刪除檔案
   */
  async restoreFile(id: string): Promise<File> {
    // 檢查檔案是否存在
    const file = await this.filesRepo.findById(id, { includeDeleted: true });

    if (!file.deletedAt) {
      throw new BadRequestException('檔案未被刪除，無需恢復');
    }

    // 恢復檔案
    const restoredFile = await this.filesRepo.restore(id);

    this.logger.info(
      { fileId: id, fileName: file.fileName },
      '檔案已恢復',
    );

    return restoredFile;
  }

  /**
   * 更新縮圖資訊
   * 由 webhook 呼叫
   */
  async updateThumbnails(
    fileId: string,
    thumbnails: any,
    status: 'completed' | 'failed',
    error?: string,
  ): Promise<void> {
    const updateData: any = {
      thumbnails,
      thumbnailStatus: status,
      thumbnailGeneratedAt: new Date(),
      updatedAt: new Date(),
    };

    if (error) {
      updateData.thumbnailError = error;
    }

    await this.filesRepo.update(fileId, updateData);
    this.logger.info({ fileId, status }, 'Thumbnails updated');
  }
}
