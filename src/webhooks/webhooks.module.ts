import { Module } from '@nestjs/common';
import { WebhooksController } from './controllers/webhooks.controller';

@Module({
  controllers: [WebhooksController],
})
export class WebhooksModule {}
