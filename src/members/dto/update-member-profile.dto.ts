import { IsString, IsOptional, Matches } from 'class-validator';

/**
 * 會員更新個人資料 DTO
 * PUT /api/member
 */
export class UpdateMemberProfileDto {
  /**
   * 會員名稱
   */
  @IsOptional()
  @IsString({ message: '名稱必須是字串' })
  name?: string;

  /**
   * 手機號碼（台灣格式：09開頭，10位數字）
   */
  @IsOptional()
  @IsString({ message: '手機號碼必須是字串' })
  @Matches(/^09\d{8}$/, { message: '手機號碼格式錯誤（須為 09 開頭的 10 位數字）' })
  phone?: string;
}
