import { IsString, MinLength } from 'class-validator';

export class DeleteFileDto {
  @IsString({ message: '檔案路徑必須是字串' })
  @MinLength(1, { message: '檔案路徑不能為空' })
  filePath: string;
}
