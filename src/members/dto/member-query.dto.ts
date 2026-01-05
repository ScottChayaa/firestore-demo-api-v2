import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ToBoolean } from '../../common/decorators/to-boolean.decorator';

/**
 * 查詢會員列表 DTO
 * 用於查詢會員列表時的篩選和排序
 * GET /api/admin/members?limit=20&cursor=xxx&orderBy=createdAt&includeDeleted=false
 */
export class MemberQueryDto extends PaginationDto {
  /**
   * 排序欄位
   * 可選值：name, email, createdAt, updatedAt
   * 預設：createdAt
   */
  @IsOptional()
  @IsEnum(['name', 'email', 'createdAt', 'updatedAt'], {
    message: '排序欄位必須是 name, email, createdAt 或 updatedAt',
  })
  orderBy?: 'name' | 'email' | 'createdAt' | 'updatedAt';

  /**
   * 是否包含已刪除的會員
   * 預設：false（不包含已刪除）
   */
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'includeDeleted 必須是布林值' })
  includeDeleted?: boolean;

  /**
   * 篩選啟用/停用狀態
   * true: 僅啟用會員
   * false: 僅停用會員
   * undefined: 所有會員
   */
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'isActive 必須是布林值' })
  isActive?: boolean;

  /**
   * 搜尋關鍵字
   * 用於搜尋 name 或 email
   */
  @IsOptional()
  @IsString({ message: '搜尋關鍵字必須是字串' })
  search?: string;
}
