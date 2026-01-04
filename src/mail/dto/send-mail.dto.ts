import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

/**
 * 發送郵件 DTO
 * 用於郵件發送 API
 * POST /api/send-email
 */
export class SendMailDto {
  /**
   * 收件人電子郵件地址
   */
  @IsEmail({}, { message: '收件人必須是有效的電子郵件地址' })
  to: string;

  /**
   * 郵件主旨
   */
  @IsString({ message: '主旨必須是字串' })
  @MinLength(1, { message: '主旨不能為空' })
  subject: string;

  /**
   * 郵件純文字內容（可選）
   */
  @IsOptional()
  @IsString({ message: '文字內容必須是字串' })
  text?: string;

  /**
   * 郵件 HTML 內容（可選）
   */
  @IsOptional()
  @IsString({ message: 'HTML 內容必須是字串' })
  html?: string;
}
