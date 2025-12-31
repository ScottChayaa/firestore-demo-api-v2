import { Module } from '@nestjs/common';
import { MembersAdminController } from './controllers/members-admin.controller';
import { MembersAdminService } from './services/members-admin.service';
import { MembersRepository } from './repositories/members.repository';

@Module({
  imports: [],
  controllers: [MembersAdminController],
  providers: [MembersAdminService, MembersRepository],
  exports: [MembersAdminService, MembersRepository],
})
export class MembersModule {}
