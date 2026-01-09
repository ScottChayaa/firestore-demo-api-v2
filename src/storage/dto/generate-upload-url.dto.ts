import { IsString, IsNumber, MinLength, MaxLength, Min } from 'class-validator';

export class GenerateUploadUrlDto {
  @IsString({ message: '檔案名稱必須是字串' })
  @MinLength(1, { message: '檔案名稱不能為空' })
  @MaxLength(255, { message: '檔案名稱不能超過 255 字元' })
  fileName: string;

  @IsString({ message: '檔案類型必須是字串' })
  contentType: string;

  @IsNumber({}, { message: '檔案大小必須是數字' })
  @Min(1, { message: '檔案大小必須大於 0' })
  fileSize: number;

  @IsString({ message: '分類必須是字串' })
  category: string;
}
