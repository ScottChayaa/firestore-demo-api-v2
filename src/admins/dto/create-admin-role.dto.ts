import { IsString, MinLength } from 'class-validator';

/**
 * 賦予現有 Firebase Auth 帳號管理員角色 DTO
 * 用於將已存在的 Firebase Auth 用戶添加到 admins 集合
 * POST /api/admin/admins/create-role
 */
export class CreateAdminRoleDto {
  /**
   * Firebase Auth UID
   * 該帳號必須已存在於 Firebase Authentication
   */
  @IsString({ message: 'UID 必須是字串' })
  uid: string;

  /**
   * 管理員名稱
   * 將作為管理員的顯示名稱
   */
  @IsString({ message: '名稱必須是字串' })
  @MinLength(1, { message: '名稱不能為空' })
  name: string;
}
