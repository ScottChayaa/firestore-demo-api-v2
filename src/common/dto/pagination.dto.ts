import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @IsString({ message: 'cursor 必須是字串' })
  cursor?: string;

  @IsOptional()
  @IsInt({ message: 'limit 必須是整數' })
  @Min(1, { message: 'limit 必須大於或等於 1' })
  @Max(100, { message: 'limit 必須小於或等於 100' })
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'order 只能是 asc 或 desc' })
  order?: 'asc' | 'desc';
}
