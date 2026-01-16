import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
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
  ) {}

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
      'Received GCS finalized event',
    );

    // 檢查是否為可處理的圖片
    if (!filePath || !this.thumbnailService.isProcessableImage(filePath, contentType)) {
      this.logger.info(
        { filePath, contentType },
        'Skipping: not an image or already a thumbnail',
      );
      return {
        message: 'File skipped (not an image or already processed)',
        cloudEventId,
        filePath,
      };
    }

    // 產生縮圖
    const result = await this.thumbnailService.generateThumbnails(filePath);

    if (result.success) {
      return {
        message: 'Thumbnails generated successfully',
        cloudEventId,
        filePath,
        thumbnails: result.thumbnails,
      };
    } else {
      this.logger.error(
        { filePath, error: result.error },
        'Failed to generate thumbnails',
      );
      return {
        message: 'Thumbnail generation failed',
        cloudEventId,
        filePath,
        error: result.error,
      };
    }
  }
}
