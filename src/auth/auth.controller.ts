import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectPinoLogger(AuthController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * 會員註冊
   * POST /api/auth/register
   */
  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    this.logger.info({ email: registerDto.email }, '會員註冊請求');
    const result = await this.authService.register(registerDto);
    this.logger.info({ uid: result.uid }, '會員註冊成功');
    return result;
  }

  /**
   * 會員登入
   * POST /api/auth/member/signInWithPassword
   */
  @Public()
  @Post('member/signInWithPassword')
  async memberSignIn(@Body() signInDto: SignInDto) {
    this.logger.info({ email: signInDto.email }, '會員登入請求');
    const result = await this.authService.signIn(signInDto);
    this.logger.info({ uid: result.uid }, '會員登入成功');
    return result;
  }

  /**
   * 管理員登入
   * POST /api/auth/admin/signInWithPassword
   */
  @Public()
  @Post('admin/signInWithPassword')
  async adminSignIn(@Body() signInDto: SignInDto) {
    this.logger.info({ email: signInDto.email }, '管理員登入請求');
    const result = await this.authService.adminSignIn(signInDto);
    this.logger.info({ uid: result.uid }, '管理員登入成功');
    return result;
  }

  /**
   * 忘記密碼
   * POST /api/auth/forgot-password
   */
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    this.logger.info({ email: forgotPasswordDto.email }, '忘記密碼請求');
    const result = await this.authService.forgotPassword(forgotPasswordDto);
    this.logger.info({ email: forgotPasswordDto.email }, '密碼重設郵件已發送');
    return result;
  }
}
