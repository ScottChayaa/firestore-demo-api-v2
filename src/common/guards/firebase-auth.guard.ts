import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject('FIREBASE_AUTH') private auth: admin.auth.Auth,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 檢查是否標記為公開路由
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少 Authorization Token');
    }

    const token = authHeader.substring(7);

    try {
      const decodedToken = await this.auth.verifyIdToken(token);
      request.user = decodedToken;
      return true;
    } catch (error) {
      throw new UnauthorizedException('無效的 Token');
    }
  }
}
