import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignInDto {
  @IsEmail({}, { message: '請提供有效的電子郵件地址' })
  email: string;

  @IsString({ message: '密碼必須是字串' })
  @MinLength(6, { message: '密碼長度至少需要 6 個字元' })
  password: string;
}
