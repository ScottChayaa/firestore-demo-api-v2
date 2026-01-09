import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FileQueryDto extends PaginationDto {
  @IsOptional()
  @IsString({ message: '分類必須是字串' })
  category?: string;

  @IsOptional()
  @IsEnum(['fileName', 'createdAt', 'fileSize'], {
    message: '排序欄位必須是 fileName, createdAt 或 fileSize',
  })
  orderBy?: 'fileName' | 'createdAt' | 'fileSize';
}
