import { IsString, MinLength, IsOptional } from 'class-validator';

/**
 * 更新管理員 DTO
 * 用於更新管理員基本資料
 * PUT /api/admin/admins/:id
 */
export class UpdateAdminDto {
  @IsOptional()
  @IsString({ message: '姓名必須是字串' })
  @MinLength(1, { message: '姓名不能為空' })
  name?: string;
}
