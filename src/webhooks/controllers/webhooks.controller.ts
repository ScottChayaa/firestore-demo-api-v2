import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ThumbnailCompletedDto } from '../dto/thumbnail-completed.dto';
import { WebhookSecretGuard } from '../guards/webhook-secret.guard';
import { FilesAdminService } from '../../files/services/files-admin.service';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly filesAdminService: FilesAdminService,
    @InjectPinoLogger(WebhooksController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * POST /api/webhooks/thumbnail-completed
   * 接收 Cloud Functions 的縮圖完成通知
   */
  @Post('thumbnail-completed')
  @UseGuards(WebhookSecretGuard)
  @HttpCode(HttpStatus.OK)
  async thumbnailCompleted(@Body() dto: ThumbnailCompletedDto) {
    this.logger.info(
      {
        fileId: dto.fileId,
        status: dto.status,
        thumbnailCount: Object.keys(dto.thumbnails).length,
      },
      'Received thumbnail completion webhook',
    );

    try {
      if (dto.status === 'completed') {
        await this.filesAdminService.updateThumbnails(
          dto.fileId,
          dto.thumbnails,
          'completed',
        );
        this.logger.info(
          { fileId: dto.fileId },
          'Thumbnails updated successfully',
        );
      } else {
        await this.filesAdminService.updateThumbnails(
          dto.fileId,
          {},
          'failed',
          dto.error,
        );
        this.logger.warn(
          { fileId: dto.fileId, error: dto.error },
          'Thumbnail generation failed',
        );
      }

      return {
        message: 'Webhook processed successfully',
        fileId: dto.fileId,
      };
    } catch (error: any) {
      this.logger.error(
        { fileId: dto.fileId, error: error.message },
        'Failed to process webhook',
      );
      throw error;
    }
  }
}
