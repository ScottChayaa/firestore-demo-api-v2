import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '請提供有效的電子郵件地址' })
  email: string;

  @IsString({ message: '密碼必須是字串' })
  @MinLength(6, { message: '密碼長度至少需要 6 個字元' })
  password: string;

  @IsString({ message: '姓名必須是字串' })
  name: string;

  @IsOptional()
  @IsString({ message: '電話必須是字串' })
  phone?: string;
}
