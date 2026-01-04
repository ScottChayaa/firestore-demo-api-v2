import { IsOptional, IsEnum, IsString, IsNumber, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * 查詢訂單列表 DTO
 * 用於查詢訂單列表時的篩選和排序
 * GET /api/admin/orders?limit=20&status=pending&minAmount=1000
 */
export class OrderQueryDto extends PaginationDto {
  /**
   * 會員 ID 篩選
   */
  @IsOptional()
  @IsString({ message: '會員 ID 必須是字串' })
  memberId?: string;

  /**
   * 訂單狀態篩選
   */
  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'cancelled'], {
    message: '狀態必須是 pending, processing, completed 或 cancelled',
  })
  status?: 'pending' | 'processing' | 'completed' | 'cancelled';

  /**
   * 最小建立時間（ISO 8601 格式）
   */
  @IsOptional()
  @IsISO8601({}, { message: 'startDate 必須是有效的 ISO 8601 日期格式' })
  startDate?: string;

  /**
   * 最大建立時間（ISO 8601 格式）
   */
  @IsOptional()
  @IsISO8601({}, { message: 'endDate 必須是有效的 ISO 8601 日期格式' })
  endDate?: string;

  /**
   * 最小金額
   */
  @IsOptional()
  @IsNumber({}, { message: '最小金額必須是數字' })
  @Type(() => Number)
  minAmount?: number;

  /**
   * 最大金額
   */
  @IsOptional()
  @IsNumber({}, { message: '最大金額必須是數字' })
  @Type(() => Number)
  maxAmount?: number;

  /**
   * 排序欄位
   * 可選值：createdAt, totalAmount
   * 預設：createdAt
   */
  @IsOptional()
  @IsEnum(['createdAt', 'totalAmount'], {
    message: '排序欄位必須是 createdAt 或 totalAmount',
  })
  orderBy?: 'createdAt' | 'totalAmount';
}
