import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  MinLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString({ message: '產品名稱必須是字串' })
  @MinLength(1, { message: '產品名稱不能為空' })
  name: string;

  @IsString({ message: '產品描述必須是字串' })
  @MinLength(1, { message: '產品描述不能為空' })
  description: string;

  @IsNumber({}, { message: '價格必須是數字' })
  @Min(0, { message: '價格不能為負數' })
  @Type(() => Number)
  price: number;

  @IsString({ message: '分類必須是字串' })
  @MinLength(1, { message: '分類不能為空' })
  category: string;

  @IsNumber({}, { message: '庫存必須是數字' })
  @Min(0, { message: '庫存不能為負數' })
  @Type(() => Number)
  stock: number;

  @IsOptional()
  @IsString({ message: '圖片 URL 必須是字串' })
  @IsUrl({}, { message: '圖片 URL 格式不正確' })
  imageUrl?: string;
}
