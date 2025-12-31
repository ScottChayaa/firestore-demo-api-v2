import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ProductQueryDto extends PaginationDto {
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

  @IsOptional()
  @IsEnum(['price', 'createdAt'], { message: '排序欄位只能是 price 或 createdAt' })
  orderBy?: 'price' | 'createdAt';
}
