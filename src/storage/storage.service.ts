import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Bucket } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';

@Injectable()
export class StorageService {
  constructor(
    @Inject('STORAGE') private readonly bucket: Bucket,
    private readonly configService: ConfigService,
    @InjectPinoLogger(StorageService.name) private readonly logger: PinoLogger,
  ) {}

  /**
   * 生成上傳用的 Signed URL
   */
  async generateUploadUrl(dto: GenerateUploadUrlDto): Promise<{
    uploadUrl: string;
    filePath: string;
    cdnUrl: string;
    expiresAt: Date;
  }> {
    // 1. 驗證檔案類型和大小
    this.validateFile(dto);

    // 2. 生成檔案路徑
    const filePath = this.generateFilePath(dto);

    // 3. 取得 GCS File 物件
    const file = this.bucket.file(filePath);

    // 4. 生成 Signed URL
    const expiresMinutes = this.configService.get<number>('storage.signedUrlExpiresMinutes');
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAt,
      contentType: dto.contentType,
    });

    // 5. 生成 CDN URL
    const cdnUrl = this.getCdnUrl(filePath);

    this.logger.info({ filePath, expiresAt }, '生成上傳 URL 成功');

    return {
      uploadUrl: signedUrl,
      filePath,
      cdnUrl,
      expiresAt,
    };
  }

  /**
   * 刪除檔案
   */
  async deleteFile(filePath: string): Promise<void> {
    const file = this.bucket.file(filePath);

    // 檢查檔案是否存在
    const [exists] = await file.exists();
    if (!exists) {
      throw new NotFoundException(`檔案不存在: ${filePath}`);
    }

    await file.delete();
    this.logger.info({ filePath }, '檔案刪除成功');
  }

  /**
   * 將檔案從暫存區移動到正式區
   * @param tempFilePath 暫存區檔案路徑（temp/...）
   * @returns 正式區檔案路徑（uploads/...）
   */
  async moveFromTempToPermanent(tempFilePath: string): Promise<string> {
    // 1. 檢查暫存檔案是否存在
    const tempFile = this.bucket.file(tempFilePath);
    const [exists] = await tempFile.exists();

    if (!exists) {
      throw new NotFoundException(`暫存檔案不存在: ${tempFilePath}`);
    }

    // 2. 生成正式路徑（將 temp/ 替換為 uploads/）
    const permanentFilePath = tempFilePath.replace(/^temp\//, 'uploads/');
    const permanentFile = this.bucket.file(permanentFilePath);

    // 3. 複製檔案到正式區
    await tempFile.copy(permanentFile);

    // 4. 刪除暫存檔案
    await tempFile.delete();

    this.logger.info(
      { from: tempFilePath, to: permanentFilePath },
      '檔案已移動到正式區',
    );

    return permanentFilePath;
  }

  /**
   * 生成檔案路徑（暫存區）
   * 格式: temp/{category}/{year}/{month}/{uuid}-{sanitizedFileName}
   */
  private generateFilePath(dto: GenerateUploadUrlDto): string {
    const prefix = 'temp'; // 使用暫存區
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uuid = randomUUID();
    const sanitizedFileName = this.sanitizeFileName(dto.fileName);

    return `${prefix}/${dto.category}/${year}/${month}/${uuid}-${sanitizedFileName}`;
  }

  /**
   * 取得 CDN URL
   */
  getCdnUrl(filePath: string): string {
    const bucketName = this.configService.get<string>('storage.bucketName');
    return `https://storage.googleapis.com/${bucketName}/${filePath}`;
  }

  /**
   * 從 CDN URL 提取檔案路徑
   * @param url CDN URL (https://storage.googleapis.com/bucket-name/temp/product/2026/01/uuid-file.jpg)
   * @returns filePath (temp/product/2026/01/uuid-file.jpg)
   */
  extractFilePathFromUrl(url: string): string {
    const match = url.match(/googleapis\.com\/[^/]+\/(.+)$/);
    return match ? match[1] : '';
  }

  /**
   * 根據分類取得檔案大小限制和允許類型
   */
  private getFileLimits(category: string): {
    maxSizeMB: number;
    allowedTypes: string[];
  } {
    const fileSizeLimits = this.configService.get('storage.fileSizeLimits');

    // 如果有配置檔案大小限制策略，且該分類存在
    if (fileSizeLimits && fileSizeLimits[category]) {
      return fileSizeLimits[category];
    }

    // 否則使用預設配置（向後相容）
    return {
      maxSizeMB: this.configService.get<number>('storage.defaultMaxFileSizeMB') || 100,
      allowedTypes:
        this.configService.get<string[]>('storage.allowedFileTypes') || ['*'],
    };
  }

  /**
   * 驗證檔案
   */
  private validateFile(dto: GenerateUploadUrlDto): void {
    // 1. 檢查全域大小限制
    const globalMaxSizeMB = this.configService.get<number>('storage.globalMaxFileSizeMB');
    const globalMaxSizeBytes = globalMaxSizeMB * 1024 * 1024;

    if (dto.fileSize > globalMaxSizeBytes) {
      throw new BadRequestException(
        `檔案大小超過全域限制 (${globalMaxSizeMB}MB)`,
      );
    }

    // 2. 取得該分類的限制
    const limits = this.getFileLimits(dto.category);
    const maxSizeBytes = limits.maxSizeMB * 1024 * 1024;

    // 3. 檔案類型檢查（支援萬用字元 "*"）
    if (
      !limits.allowedTypes.includes('*') &&
      !limits.allowedTypes.includes(dto.contentType)
    ) {
      throw new BadRequestException(
        `不支援的檔案類型: ${dto.contentType}。允許的類型: ${limits.allowedTypes.join(', ')}`,
      );
    }

    // 4. 檔案大小檢查
    if (dto.fileSize > maxSizeBytes) {
      throw new BadRequestException(
        `檔案大小超過 ${dto.category} 分類限制 (${limits.maxSizeMB}MB)`,
      );
    }
  }

  /**
   * 清理檔案名稱（移除特殊字元）
   */
  private sanitizeFileName(fileName: string): string {
    // 移除路徑遍歷字元
    let sanitized = fileName.replace(/\.\./g, '');

    // 移除特殊字元，只保留字母、數字、底線、連字號、點
    sanitized = sanitized.replace(/[^a-zA-Z0-9_.-]/g, '-');

    // 限制長度（保留副檔名）
    const maxLength = 100;
    if (sanitized.length > maxLength) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      sanitized = sanitized.substring(0, maxLength - ext.length) + ext;
    }

    return sanitized;
  }
}
