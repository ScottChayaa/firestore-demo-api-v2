import { Module } from '@nestjs/common';
import { MembersAdminController } from './controllers/members-admin.controller';
import { MembersMemberController } from './controllers/members-member.controller';
import { MembersAdminService } from './services/members-admin.service';
import { MembersMemberService } from './services/members-member.service';
import { MembersRepository } from './repositories/members.repository';

@Module({
  imports: [],
  controllers: [MembersAdminController, MembersMemberController],
  providers: [MembersAdminService, MembersMemberService, MembersRepository],
  exports: [MembersAdminService, MembersRepository],
})
export class MembersModule {}
