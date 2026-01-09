import { IsString, IsNumber, IsOptional, IsArray, IsUrl, MinLength } from 'class-validator';

export class CreateFileDto {
  @IsString({ message: '檔案名稱必須是字串' })
  @MinLength(1, { message: '檔案名稱不能為空' })
  fileName: string;

  @IsString({ message: '原始檔案名稱必須是字串' })
  @MinLength(1, { message: '原始檔案名稱不能為空' })
  originalFileName: string;

  @IsString({ message: '暫存檔案路徑必須是字串' })
  @MinLength(1, { message: '暫存檔案路徑不能為空' })
  tempFilePath: string;

  @IsString({ message: 'CDN URL 必須是字串' })
  @IsUrl({}, { message: 'CDN URL 格式不正確' })
  cdnUrl: string;

  @IsString({ message: '檔案類型必須是字串' })
  contentType: string;

  @IsNumber({}, { message: '檔案大小必須是數字' })
  fileSize: number;

  @IsString({ message: '分類必須是字串' })
  category: string;

  @IsOptional()
  @IsString({ message: '描述必須是字串' })
  description?: string;

  @IsOptional()
  @IsArray({ message: '標籤必須是陣列' })
  @IsString({ each: true, message: '每個標籤必須是字串' })
  tags?: string[];
}
