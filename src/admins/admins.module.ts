import { Module } from '@nestjs/common';
import { AdminsAdminController } from './controllers/admins-admin.controller';
import { AdminsAdminService } from './services/admins-admin.service';
import { AdminsRepository } from './repositories/admins.repository';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  controllers: [AdminsAdminController],
  providers: [AdminsAdminService, AdminsRepository],
  exports: [AdminsAdminService, AdminsRepository],
})
export class AdminsModule {}
