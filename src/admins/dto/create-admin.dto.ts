import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * 建立管理員 DTO
 * 用於建立管理員（同時建立 Firebase Auth 帳號）
 * POST /api/admin/admins
 */
export class CreateAdminDto {
  @IsEmail({}, { message: '請提供有效的電子郵件地址' })
  email: string;

  @IsString({ message: '密碼必須是字串' })
  @MinLength(6, { message: '密碼長度至少需要 6 個字元' })
  password: string;

  @IsString({ message: '姓名必須是字串' })
  @MinLength(1, { message: '姓名不能為空' })
  name: string;
}
