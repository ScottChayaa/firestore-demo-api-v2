import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ToBoolean } from '../../common/decorators/to-boolean.decorator';

export class AdminFileQueryDto extends PaginationDto {
  @IsOptional()
  @IsString({ message: '分類必須是字串' })
  category?: string;

  @IsOptional()
  @IsString({ message: '檔案類型必須是字串' })
  contentType?: string;

  @IsOptional()
  @ToBoolean()
  includeDeleted?: boolean;

  @IsOptional()
  @IsEnum(['temp', 'uploaded'], {
    message: '狀態必須是 temp 或 uploaded',
  })
  status?: 'temp' | 'uploaded';

  @IsOptional()
  @IsEnum(['fileName', 'createdAt', 'fileSize', 'updatedAt'], {
    message: '排序欄位必須是 fileName, createdAt, fileSize 或 updatedAt',
  })
  orderBy?: 'fileName' | 'createdAt' | 'fileSize' | 'updatedAt';

  @IsOptional()
  @IsNumber({}, { message: '最小檔案大小必須是數字' })
  @Type(() => Number)
  minFileSize?: number;

  @IsOptional()
  @IsNumber({}, { message: '最大檔案大小必須是數字' })
  @Type(() => Number)
  maxFileSize?: number;

  @IsOptional()
  @IsString({ message: '上傳者 UID 必須是字串' })
  uploadedBy?: string;
}
