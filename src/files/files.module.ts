import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FilesRepository } from './repositories/files.repository';
import { FilesAdminController } from './controllers/files-admin.controller';
import { FilesAdminService } from './services/files-admin.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [FilesController, FilesAdminController],
  providers: [FilesService, FilesAdminService, FilesRepository],
  exports: [FilesService, FilesAdminService],
})
export class FilesModule {}
