import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './controllers/storage.controller';

@Module({
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
