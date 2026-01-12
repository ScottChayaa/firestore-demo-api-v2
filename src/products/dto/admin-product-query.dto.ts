import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ToBoolean } from '../../common/decorators/to-boolean.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class AdminProductQueryDto extends PaginationDto {
  // 繼承自前台 ProductQueryDto 的欄位
  @IsOptional()
  @IsString({ message: '分類必須是字串' })
  category?: string;

  @IsOptional()
  @IsNumber({}, { message: '最低價格必須是數字' })
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber({}, { message: '最高價格必須是數字' })
  @Type(() => Number)
  maxPrice?: number;

  // 管理端特有欄位
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'isActive 必須是布林值' })
  isActive?: boolean;

  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'includeDeleted 必須是布林值' })
  includeDeleted?: boolean;

  @IsOptional()
  @IsEnum(['name', 'price', 'stock', 'category', 'createdAt', 'updatedAt'], {
    message:
      '排序欄位必須是 name, price, stock, category, createdAt 或 updatedAt',
  })
  orderBy?: 'name' | 'price' | 'stock' | 'category' | 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsNumber({}, { message: '最低庫存必須是數字' })
  @Type(() => Number)
  minStock?: number;

  @IsOptional()
  @IsNumber({}, { message: '最高庫存必須是數字' })
  @Type(() => Number)
  maxStock?: number;

  /**
   * 按名稱搜尋（前綴搜尋）
   * 注意：使用 name 搜尋時，無法同時使用價格/庫存範圍篩選（Firestore 限制）
   */
  @IsOptional()
  @IsString({ message: '名稱搜尋必須是字串' })
  name?: string;
}
