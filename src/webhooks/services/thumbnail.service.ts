import { Injectable, Inject } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Bucket } from '@google-cloud/storage';
import sharp from 'sharp';

interface ThumbnailConfig {
  width: number;
  height: number;
  suffix: string;
}

@Injectable()
export class ThumbnailService {
  private readonly THUMBNAIL_CONFIGS: ThumbnailConfig[] = [
    { width: 150, height: 150, suffix: 'small' },
    { width: 300, height: 300, suffix: 'medium' },
    { width: 600, height: 600, suffix: 'large' },
  ];

  private readonly SUPPORTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  private readonly SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

  constructor(
    @Inject('STORAGE') private readonly bucket: Bucket,
    @InjectPinoLogger(ThumbnailService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * 檢查檔案是否為可處理的圖片
   */
  isProcessableImage(filePath: string, contentType?: string): boolean {
    // 跳過已在 thumbs 資料夾的檔案（防止無限迴圈）
    if (filePath.startsWith('thumbs/')) {
      return false;
    }

    // 檢查 content type
    if (contentType && this.SUPPORTED_IMAGE_TYPES.includes(contentType)) {
      return true;
    }

    // 備用：檢查副檔名
    const ext = filePath.toLowerCase().split('.').pop();
    return this.SUPPORTED_EXTENSIONS.includes(ext || '');
  }

  /**
   * 產生縮圖
   */
  async generateThumbnails(filePath: string): Promise<{
    success: boolean;
    thumbnails?: string[];
    error?: string;
  }> {
    try {
      this.logger.info({ filePath }, '開始產生縮圖');

      // 下載原始檔案
      const file = this.bucket.file(filePath);
      const [buffer] = await file.download();

      const thumbnails: string[] = [];

      for (const config of this.THUMBNAIL_CONFIGS) {
        const thumbnailPath = this.generateThumbnailPath(filePath, config.suffix);

        // 縮放圖片
        const resizedBuffer = await sharp(buffer)
          .resize(config.width, config.height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        // 上傳縮圖
        const thumbnailFile = this.bucket.file(thumbnailPath);
        await thumbnailFile.save(resizedBuffer, {
          contentType: 'image/jpeg',
          metadata: {
            originalPath: filePath,
            thumbnailSize: config.suffix,
          },
        });

        thumbnails.push(thumbnailPath);
        this.logger.info(
          { thumbnailPath, width: config.width, height: config.height },
          '縮圖建立完成',
        );
      }

      this.logger.info(
        { filePath, thumbnailCount: thumbnails.length },
        '所有縮圖產生完成',
      );

      return { success: true, thumbnails };
    } catch (error: any) {
      this.logger.error(
        { filePath, error: error.message },
        '縮圖產生失敗',
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * 產生縮圖路徑
   * 範例: uploads/product/202601/uuid-file.jpg -> thumbs/product/202601/uuid-file_small.jpg
   */
  private generateThumbnailPath(originalPath: string, suffix: string): string {
    // 將 uploads/ 或 temp/ 替換成 thumbs/
    const pathWithThumbsPrefix = originalPath.replace(
      /^(uploads|temp)\//,
      'thumbs/',
    );

    // 在副檔名前插入 suffix
    const lastDotIndex = pathWithThumbsPrefix.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return `${pathWithThumbsPrefix}_${suffix}.jpg`;
    }

    return `${pathWithThumbsPrefix.substring(0, lastDotIndex)}_${suffix}.jpg`;
  }
}
