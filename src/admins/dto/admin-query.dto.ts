import { IsOptional, IsEnum, IsBoolean, IsISO8601, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ToBoolean } from '../../common/decorators/to-boolean.decorator';

/**
 * 查詢管理員列表 DTO
 * 用於查詢管理員列表時的篩選和排序
 * GET /api/admin/admins?limit=20&cursor=xxx&orderBy=createdAt&includeDeleted=false
 */
export class AdminQueryDto extends PaginationDto {
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
   * 是否包含已刪除的管理員
   * 預設：false（不包含已刪除）
   */
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'includeDeleted 必須是布林值' })
  includeDeleted?: boolean;

  /**
   * 篩選啟用/停用狀態
   * true: 僅啟用管理員
   * false: 僅停用管理員
   * undefined: 所有管理員
   */
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'isActive 必須是布林值' })
  isActive?: boolean;

  /**
   * 開始日期（篩選 createdAt >= startDate）
   * 格式：ISO 8601（例如：2025-01-01 或 2025-01-01T00:00:00Z）
   */
  @IsOptional()
  @IsISO8601({}, { message: 'startDate 必須是有效的 ISO 8601 日期格式' })
  startDate?: string;

  /**
   * 結束日期（篩選 createdAt <= endDate）
   * 格式：ISO 8601（例如：2025-12-31 或 2025-12-31T23:59:59Z）
   */
  @IsOptional()
  @IsISO8601({}, { message: 'endDate 必須是有效的 ISO 8601 日期格式' })
  endDate?: string;

  /**
   * 按名稱搜尋（前綴搜尋）
   * 注意：使用 name 搜尋時，無法同時使用 startDate 和 endDate（Firestore 限制）
   */
  @IsOptional()
  @IsString({ message: '名稱搜尋必須是字串' })
  name?: string;
}
