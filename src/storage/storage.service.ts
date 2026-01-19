import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Bucket } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { STORAGE_TEMP, STORAGE_MAIN } from '../firebase/firebase.constants';

export type BucketType = 'temp' | 'main' | 'eventarc';

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_TEMP) private readonly bucketTemp: Bucket,
    @Inject(STORAGE_MAIN) private readonly bucketMain: Bucket,
    private readonly configService: ConfigService,
    @InjectPinoLogger(StorageService.name) private readonly logger: PinoLogger,
  ) {}

  /**
   * 生成上傳用的 Signed URL（使用 TEMP bucket）
   */
  async generateUploadUrl(dto: GenerateUploadUrlDto): Promise<{
    uploadUrl: string;
    filePath: string;
    cdnUrl: string;
    expiresAt: Date;
  }> {
    // 1. 驗證檔案類型和大小
    this.validateFile(dto);

    // 2. 生成檔案路徑（不需要 temp/ 前綴，因為整個 bucket 就是暫存）
    const filePath = this.generateFilePath(dto);

    // 3. 取得 TEMP bucket 的 GCS File 物件
    const file = this.bucketTemp.file(filePath);

    // 4. 生成 Signed URL
    const expiresMinutes = this.configService.get<number>('storage.signedUrlExpiresMinutes');
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAt,
      contentType: dto.contentType,
    });

    // 5. 生成 CDN URL（指向 TEMP bucket）
    const cdnUrl = this.getCdnUrl(filePath, 'temp');

    this.logger.info({ filePath, expiresAt }, '生成上傳 URL 成功 (TEMP bucket)');

    return {
      uploadUrl: signedUrl,
      filePath,
      cdnUrl,
      expiresAt,
    };
  }

  /**
   * 刪除檔案
   * @param filePath 檔案路徑
   * @param bucketType 指定 bucket（預設 main）
   */
  async deleteFile(filePath: string, bucketType: BucketType = 'main'): Promise<void> {
    const bucket = bucketType === 'temp' ? this.bucketTemp : this.bucketMain;
    const file = bucket.file(filePath);

    // 檢查檔案是否存在
    const [exists] = await file.exists();
    if (!exists) {
      throw new NotFoundException(`檔案不存在: ${filePath}`);
    }

    await file.delete();
    this.logger.info({ filePath, bucketType }, '檔案刪除成功');
  }

  /**
   * 將檔案從暫存區移動到正式區（跨 bucket 複製）
   * @param tempFilePath 暫存區檔案路徑（在 TEMP bucket 中）
   * @returns 正式區檔案路徑（在 MAIN bucket 中，路徑相同）
   */
  async moveFromTempToPermanent(tempFilePath: string): Promise<string> {
    // 1. 檢查暫存檔案是否存在（在 TEMP bucket）
    const tempFile = this.bucketTemp.file(tempFilePath);
    const [exists] = await tempFile.exists();

    if (!exists) {
      throw new NotFoundException(`暫存檔案不存在: ${tempFilePath}`);
    }

    // 2. 正式路徑與暫存路徑相同（只是在不同 bucket）
    const permanentFilePath = tempFilePath;
    const permanentFile = this.bucketMain.file(permanentFilePath);

    // 3. 跨 bucket 複製檔案（TEMP → MAIN）
    await tempFile.copy(permanentFile);

    // 4. 刪除暫存檔案
    await tempFile.delete();

    this.logger.info(
      {
        from: `TEMP:${tempFilePath}`,
        to: `MAIN:${permanentFilePath}`
      },
      '檔案已移動到正式區',
    );

    return permanentFilePath;
  }

  /**
   * 生成檔案路徑
   * 格式: {entity}/{YYYYMM}/{uuid}-{sanitizedFileName}
   * 注意：不再需要 temp/ 或 uploads/ 前綴，因為使用獨立 bucket
   */
  private generateFilePath(dto: GenerateUploadUrlDto): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uuid = randomUUID();
    const sanitizedFileName = this.sanitizeFileName(dto.fileName);

    return `${dto.entity}/${year}${month}/${uuid}-${sanitizedFileName}`;
  }

  /**
   * 取得 CDN URL
   * @param filePath 檔案路徑
   * @param bucketType 指定 bucket（預設 main）
   */
  getCdnUrl(filePath: string, bucketType: BucketType = 'main'): string {
    let bucketName: string;

    switch (bucketType) {
      case 'temp':
        bucketName = this.configService.get<string>('storage.bucketTemp');
        break;
      case 'eventarc':
        bucketName = this.configService.get<string>('storage.bucketEventarc');
        break;
      case 'main':
      default:
        bucketName = this.configService.get<string>('storage.bucketMain');
        break;
    }

    return `https://storage.googleapis.com/${bucketName}/${filePath}`;
  }

  /**
   * 從 CDN URL 提取檔案路徑和 bucket 類型
   * @param url CDN URL (https://storage.googleapis.com/bucket-name/entity/202601/uuid-file.jpg)
   * @returns { filePath, bucketType }
   */
  extractFilePathFromUrl(url: string): { filePath: string; bucketType: BucketType } {
    const match = url.match(/googleapis\.com\/([^/]+)\/(.+)$/);
    if (!match) {
      return { filePath: '', bucketType: 'main' };
    }

    const bucketName = match[1];
    const filePath = match[2];

    // 判斷 bucket 類型
    const bucketTemp = this.configService.get<string>('storage.bucketTemp');
    const bucketMain = this.configService.get<string>('storage.bucketMain');
    const bucketEventarc = this.configService.get<string>('storage.bucketEventarc');

    let bucketType: BucketType = 'main';
    if (bucketName === bucketTemp) {
      bucketType = 'temp';
    } else if (bucketName === bucketEventarc) {
      bucketType = 'eventarc';
    } else if (bucketName === bucketMain) {
      bucketType = 'main';
    }

    return { filePath, bucketType };
  }

  /**
   * 根據分類取得檔案大小限制和允許類型
   * 預設 : other (支援全類型)
   */
  private getFileLimits(category: string = 'other'): {
    maxSizeMB: number;
    allowedTypes: string[];
  } {
    const fileSizeLimits = this.configService.get('storage.fileSizeLimits');

    // 如果有配置檔案大小限制策略，且該分類存在
    if (fileSizeLimits && fileSizeLimits[category]) {
      return fileSizeLimits[category];
    }

    this.logger.warn(`查無允許 category: ${category}, 使用預設限制`);

    // 使用預設限制（寫死）
    return {
      maxSizeMB: 100,
      allowedTypes: ['*'],
    };
  }

  /**
   * 驗證檔案
   */
  private validateFile(dto: GenerateUploadUrlDto): void {
    // 取得該分類的限制
    const limits = this.getFileLimits(dto.category);
    const maxSizeBytes = limits.maxSizeMB * 1024 * 1024;

    // 檔案類型檢查（支援萬用字元 "*"）
    if (
      !limits.allowedTypes.includes('*') &&
      !limits.allowedTypes.includes(dto.contentType)
    ) {
      throw new BadRequestException(
        `不支援的檔案類型: ${dto.contentType}。允許的類型: ${limits.allowedTypes.join(', ')}`,
      );
    }

    // 檔案大小檢查
    if (dto.fileSize > maxSizeBytes) {
      throw new BadRequestException(
        `檔案大小超過 ${dto.category} 分類限制 (${limits.maxSizeMB} MB)`,
      );
    }
  }

  /**
   * 清理檔案名稱（移除危險字元，保留中文等 Unicode 字元）
   */
  private sanitizeFileName(fileName: string): string {
    // 移除路徑遍歷字元和危險字元
    let sanitized = fileName
      .replace(/\.\./g, '')                   // 路徑遍歷
      .replace(/[/\\:*?"<>|]/g, '-')          // Windows/Unix 禁用字元
      .replace(/[\x00-\x1F\x7F]/g, '')        // 控制字元
      .replace(/\s+/g, '_')                   // 將空格替換為底線（提高可讀性）
      .trim();                                // 移除前後空白

    // 避免檔名只有點或破折號
    if (/^[.-]+$/.test(sanitized)) {
      sanitized = 'file' + sanitized;
    }

    // 限制長度（保留副檔名）- 注意中文字元佔較多 bytes
    const maxLength = 200;  // 增加長度限制以容納中文
    if (sanitized.length > maxLength) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      sanitized = sanitized.substring(0, maxLength - ext.length) + ext;
    }

    return sanitized;
  }
}
