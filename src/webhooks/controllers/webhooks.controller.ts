import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ThumbnailService } from '../services/thumbnail.service';

/**
 * GCS CloudEvent 結構
 * Eventarc 傳送的 GCS object.finalized 事件格式
 */
interface GcsCloudEvent {
  bucket?: string;
  name?: string;
  contentType?: string;
  size?: string;
  timeCreated?: string;
  updated?: string;
  metageneration?: string;
  md5Hash?: string;
  generation?: string;
}

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly thumbnailService: ThumbnailService,
    @InjectPinoLogger(WebhooksController.name)
    private readonly logger: PinoLogger,
  ) { }

  /**
   * POST /api/webhooks/gcs-finalized
   * 接收 Eventarc GCS object.finalized 事件並處理縮圖
   */
  @Public()
  @Post('gcs-finalized')
  @HttpCode(HttpStatus.OK)
  async handleGcsFinalized(
    @Body() body: GcsCloudEvent,
    @Headers() headers: Record<string, string>,
  ) {
    const cloudEventId = headers['ce-id'];
    const filePath = body.name;
    const contentType = body.contentType;

    this.logger.info(
      {
        cloudEventId,
        bucket: body.bucket,
        filePath,
        contentType,
        size: body.size,
      },
      '收到 GCS finalized event',
    );

    // 檢查是否為可處理的路徑
    if (!filePath || !this.thumbnailService.isProcessableFolder(filePath)) {
      this.logger.info('略過: 非可處理的路徑');
      return {
        message: '略過: 非可處理的路徑',
        cloudEventId,
        filePath,
      };
    }

    // 檢查是否為可處理的圖片
    if (!filePath || !this.thumbnailService.isProcessableImage(filePath, contentType)) {
      this.logger.info('略過: 非圖片');
      return {
        message: '略過: 非圖片',
        cloudEventId,
        filePath,
      };
    }

    try {
      // 產生縮圖
      await this.thumbnailService.generateThumbnails(filePath);
    } catch (error: any) {
      this.logger.error({ error }, `縮圖產生失敗: ${filePath}`);
      //throw new HttpException(`縮圖產生失敗: ${filePath}`, 500); // TODO: 如果回傳 500, Eventarc 會有重試機制再次呼叫
      return { success: false, error: error.message };
    }
  }
}
