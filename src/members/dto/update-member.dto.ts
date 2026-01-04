import { IsString, MinLength, IsOptional } from 'class-validator';

/**
 * 更新會員基本資料 DTO
 * 用於更新會員的 name 和 phone
 * PUT /api/admin/members/:id 或 PUT /api/member
 */
export class UpdateMemberDto {
  @IsOptional()
  @IsString({ message: '姓名必須是字串' })
  @MinLength(1, { message: '姓名不能為空' })
  name?: string;

  @IsOptional()
  @IsString({ message: '電話必須是字串' })
  phone?: string;
}
