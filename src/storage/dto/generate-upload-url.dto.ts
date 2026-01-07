import { IsString, IsNumber, IsIn, MinLength, MaxLength, Min, Max } from 'class-validator';

export class GenerateUploadUrlDto {
  @IsString({ message: '檔案名稱必須是字串' })
  @MinLength(1, { message: '檔案名稱不能為空' })
  @MaxLength(255, { message: '檔案名稱不能超過 255 字元' })
  fileName: string;

  @IsString({ message: '檔案類型必須是字串' })
  @IsIn(['image/jpeg', 'image/png', 'image/gif', 'image/webp'], {
    message: '檔案類型必須是 image/jpeg, image/png, image/gif 或 image/webp',
  })
  contentType: string;

  @IsNumber({}, { message: '檔案大小必須是數字' })
  @Min(1, { message: '檔案大小必須大於 0' })
  @Max(5 * 1024 * 1024, { message: '檔案大小不能超過 5MB' })
  fileSize: number;

  @IsString({ message: '分類必須是字串' })
  @IsIn(['product', 'member', 'order'], {
    message: '分類必須是 product, member 或 order',
  })
  category: string;
}
