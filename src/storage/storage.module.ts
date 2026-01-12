import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageAdminController } from './controllers/storage-admin.controller';

@Module({
  controllers: [StorageAdminController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
