import { IsString, IsNumber, MinLength, MaxLength, Min, IsNotEmpty } from 'class-validator';

export class GenerateUploadUrlDto {
  @IsString({ message: '檔案名稱必須是字串' })
  @IsNotEmpty({ message: '檔案名稱不能為空' })
  @MaxLength(100, { message: '檔案名稱不能超過 100 字元' })
  fileName: string;

  @IsString({ message: '檔案類型必須是字串' })
  contentType: string;

  @IsNumber({}, { message: '檔案大小必須是數字' })
  @Min(1, { message: '檔案大小必須大於 0' })
  fileSize: number;

  /**
   * 分類 : image, video, document, other
   * - 用於上傳檔案類型的限制設定
   */
  @IsString({ message: '分類必須是字串' })
  @IsNotEmpty({ message: '分類不能為空' })
  category: string;

  /**
   * 上傳必須指定實體
   * - 若不指定, 則檔案上傳後只會在 temp/, 無法搬到正確的 uploads/, 留在 temp/ 的檔案最後會被自動刪除  
   * - 用於 SignedUrl, temp/ 和 uploads/ 路徑設定
   */
  @IsString({ message: '實體必須是字串' })
  @IsNotEmpty({ message: '實體名稱不能為空' })
  @MaxLength(100, { message: '實體名稱不能超過 100 字元' })
  entity: string;
}
