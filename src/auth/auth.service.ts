import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { RegisterDto } from './dto/register.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleSignInDto } from './dto/google-sign-in.dto';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Injectable()
export class AuthService {
  private readonly webApiKey: string;

  constructor(
    @Inject('FIREBASE_APP') private firebaseApp: admin.app.App,
    @Inject('FIRESTORE') private firestore: admin.firestore.Firestore,
    private configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.webApiKey = this.configService.get<string>('firebase.webApiKey');
  }

  /**
   * 會員註冊
   * 1. 建立 Firebase Auth 用戶
   * 2. 設定 Custom Claims（member 角色）
   * 3. 在 Firestore 建立 member document
   */
  async register(dto: RegisterDto) {
    try {
      // 1. 建立 Firebase Auth 用戶
      const userRecord = await this.firebaseApp.auth().createUser({
        email: dto.email,
        password: dto.password,
        displayName: dto.name,
      });

      // 2. 設定 Custom Claims（member 角色）
      await this.firebaseApp.auth().setCustomUserClaims(userRecord.uid, {
        member: true,
      });

      // 3. 在 Firestore 建立 member document
      await this.firestore
        .collection('members')
        .doc(userRecord.uid)
        .set({
          email: dto.email,
          name: dto.name,
          phone: dto.phone || null,
          isActive: true,
          deletedAt: null,
          deletedBy: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return {
        message: '註冊成功',
        uid: userRecord.uid,
        email: userRecord.email,
      };
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        throw new ConflictException('此電子郵件已被註冊');
      }
      throw new BadRequestException(`註冊失敗: ${error.message}`);
    }
  }

  /**
   * 會員登入
   * 使用 Firebase REST API 取得 ID Token
   */
  async signIn(dto: SignInDto) {
    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.webApiKey}`,
        {
          email: dto.email,
          password: dto.password,
          returnSecureToken: true,
        },
      );

      // 驗證用戶是否為會員
      const decodedToken = await this.firebaseApp
        .auth()
        .verifyIdToken(response.data.idToken);

      if (!decodedToken.member) {
        throw new UnauthorizedException('您沒有會員權限');
      }

      return {
        idToken: response.data.idToken,
        refreshToken: response.data.refreshToken,
        expiresIn: response.data.expiresIn,
        uid: response.data.localId,
      };
    } catch (error) {
      if (error.response?.data?.error?.message) {
        const errorMessage = error.response.data.error.message;
        if (errorMessage === 'EMAIL_NOT_FOUND') {
          throw new UnauthorizedException('電子郵件或密碼錯誤');
        }
        if (errorMessage === 'INVALID_PASSWORD') {
          throw new UnauthorizedException('電子郵件或密碼錯誤');
        }
        if (errorMessage === 'USER_DISABLED') {
          throw new UnauthorizedException('此帳號已被停用');
        }
      }
      throw new UnauthorizedException('登入失敗');
    }
  }

  /**
   * 管理員登入
   * 使用 Firebase REST API 取得 ID Token
   */
  async adminSignIn(dto: SignInDto) {
    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.webApiKey}`,
        {
          email: dto.email,
          password: dto.password,
          returnSecureToken: true,
        },
      );

      // 驗證用戶是否為管理員
      const decodedToken = await this.firebaseApp
        .auth()
        .verifyIdToken(response.data.idToken);
      console.log(decodedToken);
      if (!decodedToken.admin) {
        this.logger.warn('您沒有管理員權限');
        throw new UnauthorizedException('您沒有管理員權限');
        
      }

      return {
        idToken: response.data.idToken,
        refreshToken: response.data.refreshToken,
        expiresIn: response.data.expiresIn,
        uid: response.data.localId,
      };
    } catch (error) {
      if (error.response?.data?.error?.message) {
        const errorMessage = error.response.data.error.message;
        if (errorMessage === 'EMAIL_NOT_FOUND') {
          throw new UnauthorizedException('電子郵件或密碼錯誤');
        }
        if (errorMessage === 'INVALID_PASSWORD') {
          throw new UnauthorizedException('電子郵件或密碼錯誤');
        }
        if (errorMessage === 'USER_DISABLED') {
          throw new UnauthorizedException('此帳號已被停用');
        }
      }
      throw new UnauthorizedException('登入失敗');
    }
  }

  /**
   * 忘記密碼
   * 發送密碼重設郵件
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    try {
      await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${this.webApiKey}`,
        {
          requestType: 'PASSWORD_RESET',
          email: dto.email,
        },
      );

      return {
        message: '密碼重設郵件已發送，請檢查您的信箱',
      };
    } catch (error) {
      if (error.response?.data?.error?.message === 'EMAIL_NOT_FOUND') {
        // 為了安全性，即使電子郵件不存在也返回成功訊息
        return {
          message: '密碼重設郵件已發送，請檢查您的信箱',
        };
      }
      throw new BadRequestException('發送密碼重設郵件失敗');
    }
  }

  /**
   * Google 第三方登入
   * 1. 驗證 Google idToken
   * 2. 檢查會員是否存在，不存在則建立
   * 3. 設定 Custom Claims（member 角色）
   * 4. 刷新 token 並返回
   */
  async signInWithGoogle(dto: GoogleSignInDto) {
    try {
      // 1. 驗證 idToken
      const decodedToken = await this.firebaseApp
        .auth()
        .verifyIdToken(dto.idToken);

      const uid = decodedToken.uid;
      const email = decodedToken.email;
      const name = decodedToken.name || email?.split('@')[0];

      // 2. 檢查會員是否已存在於 Firestore
      const memberDoc = await this.firestore
        .collection('members')
        .doc(uid)
        .get();

      if (!memberDoc.exists) {
        // 第一次使用 Google 登入，建立會員記錄
        await this.firestore
          .collection('members')
          .doc(uid)
          .set({
            email,
            name,
            phone: null,
            isActive: true,
            deletedAt: null,
            deletedBy: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        this.logger.info({ uid, email }, '新會員透過 Google 登入註冊');
      }

      // 3. 確保 Custom Claims 已設定（避免重複登入時遺失）
      if (!decodedToken.member) {
        await this.firebaseApp.auth().setCustomUserClaims(uid, {
          member: true,
        });

        this.logger.info({ uid }, '設定會員 Custom Claims');
      }

      // 4. 當設定了新的 custom claims 時，需要刷新 token
      // 使用 refreshToken 通過 Firebase REST API 獲取包含新 claims 的 idToken
      if (!decodedToken.member || !memberDoc.exists) {
        // 需要刷新 token（新會員或缺少 custom claims）
        const tokenResponse = await axios.post(
          `https://securetoken.googleapis.com/v1/token?key=${this.webApiKey}`,
          {
            grant_type: 'refresh_token',
            refresh_token: dto.refreshToken,
          },
        );

        return {
          idToken: tokenResponse.data.id_token,
          refreshToken: tokenResponse.data.refresh_token,
          expiresIn: tokenResponse.data.expires_in,
          uid,
          message: memberDoc.exists ? '登入成功' : '註冊並登入成功',
        };
      }

      // 已存在的會員且已有 custom claims，直接返回原 token
      return {
        idToken: dto.idToken,
        refreshToken: dto.refreshToken,
        expiresIn: '3600',
        uid,
        message: '登入成功',
      };
    } catch (error) {
      this.logger.error({ error: error.message }, 'Google 登入失敗');

      if (error.code === 'auth/id-token-expired') {
        throw new UnauthorizedException('登入已過期，請重新登入');
      }
      if (error.code === 'auth/argument-error') {
        throw new BadRequestException('無效的 ID Token');
      }

      throw new UnauthorizedException('Google 登入失敗');
    }
  }
}
