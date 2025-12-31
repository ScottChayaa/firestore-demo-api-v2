import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

/**
 * 建立會員 DTO
 * 用於管理員建立會員（同時建立 Firebase Auth 帳號）
 * POST /api/admin/members
 */
export class CreateMemberDto {
  @IsEmail({}, { message: '請提供有效的電子郵件地址' })
  email: string;

  @IsString({ message: '密碼必須是字串' })
  @MinLength(6, { message: '密碼長度至少需要 6 個字元' })
  password: string;

  @IsString({ message: '姓名必須是字串' })
  @MinLength(1, { message: '姓名不能為空' })
  name: string;

  @IsOptional()
  @IsString({ message: '電話必須是字串' })
  phone?: string;
}
