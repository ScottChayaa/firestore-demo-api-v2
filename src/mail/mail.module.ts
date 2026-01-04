import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';

/**
 * 郵件模組
 * 提供郵件發送功能（Nodemailer + SMTP）
 * - 支援純文字和 HTML 郵件
 * - 提供密碼重置郵件模板
 * - 提供歡迎郵件模板
 */
@Module({
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService], // 匯出供其他模組使用（例如 Auth Module）
})
export class MailModule {}
