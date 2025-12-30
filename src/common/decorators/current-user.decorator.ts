import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): DecodedIdToken => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
