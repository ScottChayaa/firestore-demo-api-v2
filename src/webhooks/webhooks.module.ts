import { Module } from '@nestjs/common';
import { WebhooksController } from './controllers/webhooks.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
