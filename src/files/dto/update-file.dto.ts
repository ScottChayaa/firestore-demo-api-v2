import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateFileDto {
  @IsOptional()
  @IsString({ message: '描述必須是字串' })
  description?: string;

  @IsOptional()
  @IsArray({ message: '標籤必須是陣列' })
  @IsString({ each: true, message: '每個標籤必須是字串' })
  tags?: string[];
}
