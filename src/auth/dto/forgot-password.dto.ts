import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: '請提供有效的電子郵件地址' })
  email: string;
}
