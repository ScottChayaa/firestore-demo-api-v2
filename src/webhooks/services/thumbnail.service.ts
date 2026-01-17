import { Injectable, Inject } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Bucket } from '@google-cloud/storage';
import sharp from 'sharp';
import { STORAGE } from '../../firebase/firebase.constants';

type OutputFormat = 'jpeg' | 'webp';

interface ThumbnailConfig {
  name: string;
  width: number;
  height: number;
  enabled: boolean;
}

interface ThumbnailSettings {
  /**
   * 要處理的來源資料夾
   */
  sourceFolders: string[];
  /**
   * 輸出格式: 'jpeg' | 'webp'
   */
  outputFormat: OutputFormat;
  /**
   * 輸出品質 (1-100)
   */
  outputQuality: number;
  /**
   * 各尺寸設定
   */
  sizes: ThumbnailConfig[];
}

@Injectable()
export class ThumbnailService {
  // 縮圖設定
  private readonly settings: ThumbnailSettings = {
    sourceFolders: ['uploads'],
    outputFormat: 'webp',
    outputQuality: 80,
    sizes: [
      { name: 'small', width: 150, height: 150, enabled: true },
      { name: 'medium', width: 300, height: 300, enabled: true },
      { name: 'large', width: 600, height: 600, enabled: true },
    ],
  };

  private readonly SUPPORTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  private readonly SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

  constructor(
    @Inject(STORAGE) private readonly bucket: Bucket,
    @InjectPinoLogger(ThumbnailService.name)
    private readonly logger: PinoLogger,
  ) { }

  /**
   * 檢查檔案是否為可處理的資料夾
   */
  isProcessableFolder(filePath: string): boolean {
    // 跳過已在 thumbs 資料夾的檔案（防止無限迴圈）
    if (filePath.startsWith('thumbs/')) {
      return false;
    }

    // 檢查是否在允許的來源資料夾中
    const isInSourceFolder = this.settings.sourceFolders.some((folder) =>
      filePath.startsWith(`${folder}/`),
    );
    if (!isInSourceFolder) {
      return false;
    }

    return true;
  }

  /**
   * 檢查檔案是否為可處理的圖片
   */
  isProcessableImage(filePath: string, contentType?: string): boolean {
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
  async generateThumbnails(filePath: string): Promise<void> {
    this.logger.info(`開始產生縮圖: ${filePath}`);

    // 下載原始檔案
    const file = this.bucket.file(filePath);
    const [buffer] = await file.download();

    const thumbnails: string[] = [];
    const enabledSizes = this.settings.sizes.filter((size) => size.enabled);

    for (const config of enabledSizes) {
      const thumbnailPath = this.generateThumbnailPath(filePath, config.name);

      // 縮放圖片並轉換格式
      const resizedBuffer = await this.processImage(buffer, config);

      // 上傳縮圖
      const thumbnailFile = this.bucket.file(thumbnailPath);
      await thumbnailFile.save(resizedBuffer, {
        contentType: this.getContentType(),
        metadata: {
          originalPath: filePath,
          thumbnailSize: config.name,
        },
      });

      thumbnails.push(thumbnailPath);
      this.logger.info(
        `${config.name} 縮圖建立完成 : ${thumbnailPath}`,
      );
    }

    this.logger.info(
      `所有縮圖產生完成: ${filePath}`,
    );
  }

  /**
   * 處理圖片縮放和格式轉換
   */
  private async processImage(
    buffer: Buffer,
    config: ThumbnailConfig,
  ): Promise<Buffer> {
    const resized = sharp(buffer).resize(config.width, config.height, {
      fit: 'inside',
      withoutEnlargement: true,
    });

    if (this.settings.outputFormat === 'webp') {
      return resized.webp({ quality: this.settings.outputQuality }).toBuffer();
    }

    return resized.jpeg({ quality: this.settings.outputQuality }).toBuffer();
  }

  /**
   * 取得輸出的 content type
   */
  private getContentType(): string {
    return this.settings.outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';
  }

  /**
   * 取得輸出的副檔名
   */
  private getOutputExtension(): string {
    return this.settings.outputFormat === 'webp' ? 'webp' : 'jpg';
  }

  /**
   * 產生縮圖路徑
   * 範例: uploads/product/202601/uuid-file.jpg -> thumbs/small/uploads/product/202601/uuid-file.webp
   */
  private generateThumbnailPath(originalPath: string, sizeName: string): string {
    const relativePath = originalPath;

    // 替換副檔名
    const lastDotIndex = relativePath.lastIndexOf('.');
    const pathWithoutExt =
      lastDotIndex === -1 ? relativePath : relativePath.substring(0, lastDotIndex);

    // 組合新路徑: thumbs/{size}/{sourceFolders}/{relativePath}.{ext}
    return `thumbs/${sizeName}/${pathWithoutExt}.${this.getOutputExtension()}`;
  }
}
