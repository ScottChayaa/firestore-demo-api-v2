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
    @InjectPinoLogger(WebhooksController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * POST /api/webhooks/gcs-finalized
   * 接收 Eventarc GCS object.finalized 事件
   */
  @Public()
  @Post('gcs-finalized')
  @HttpCode(HttpStatus.OK)
  async handleGcsFinalized(
    @Body() body: GcsCloudEvent,
    @Headers() headers: Record<string, string>,
  ) {
    // 從 headers 取得 CloudEvent 屬性
    const cloudEventId = headers['ce-id'];
    const cloudEventSource = headers['ce-source'];
    const cloudEventType = headers['ce-type'];
    const cloudEventSubject = headers['ce-subject'];
    const cloudEventTime = headers['ce-time'];

    this.logger.info(
      {
        cloudEventId,
        cloudEventType,
        cloudEventSource,
        cloudEventSubject,
        cloudEventTime,
        bucket: body.bucket,
        name: body.name,
        contentType: body.contentType,
        size: body.size,
        timeCreated: body.timeCreated,
      },
      'Received GCS finalized event',
    );

    // 目前只回傳成功，確認事件已收到
    return {
      message: 'GCS finalized event received',
      cloudEventId,
      file: {
        bucket: body.bucket,
        name: body.name,
        contentType: body.contentType,
        size: body.size,
      },
    };
  }
}
