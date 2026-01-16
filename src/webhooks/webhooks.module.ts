import { Module } from '@nestjs/common';
import { WebhooksController } from './controllers/webhooks.controller';
import { ThumbnailService } from './services/thumbnail.service';

@Module({
  controllers: [WebhooksController],
  providers: [ThumbnailService],
})
export class WebhooksModule {}
