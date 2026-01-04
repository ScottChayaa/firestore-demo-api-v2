import { IsString, MinLength } from 'class-validator';

/**
 * 賦予現有 Firebase Auth 帳號會員角色 DTO
 * 用於將已存在的 Firebase Auth 用戶添加到 members 集合
 * POST /api/admin/members/assign-role
 */
export class AssignMemberRoleDto {
  /**
   * Firebase Auth UID
   * 該帳號必須已存在於 Firebase Authentication
   */
  @IsString({ message: 'UID 必須是字串' })
  uid: string;

  /**
   * 會員名稱
   * 將作為會員的顯示名稱
   */
  @IsString({ message: '名稱必須是字串' })
  @MinLength(1, { message: '名稱不能為空' })
  name: string;
}
