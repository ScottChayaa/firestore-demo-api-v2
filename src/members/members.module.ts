import { Module } from '@nestjs/common';
import { MembersAdminController } from './controllers/members-admin.controller';
import { MemberController } from './controllers/member.controller';
import { MembersAdminService } from './services/members-admin.service';
import { MemberService } from './services/member.service';
import { MembersRepository } from './repositories/members.repository';

@Module({
  imports: [],
  controllers: [MembersAdminController, MemberController],
  providers: [MembersAdminService, MemberService, MembersRepository],
  exports: [MembersAdminService, MembersRepository],
})
export class MembersModule {}
