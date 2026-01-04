import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { MailService } from './mail.service';
import { SendMailDto } from './dto/send-mail.dto';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Public } from '../common/decorators/public.decorator';

/**
 * 郵件 Controller
 * 提供郵件發送端點
 * 注意：此端點為公開 API，使用 ThrottlerGuard 防止濫用
 */
@Controller('send-email')
export class MailController {
  constructor(
    private readonly mailService: MailService,
    @InjectPinoLogger(MailController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * POST /api/send-email
   * 發送郵件
   * 頻率限制：60 秒內最多 10 次請求
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post()
  @HttpCode(HttpStatus.OK)
  async sendEmail(@Body() dto: SendMailDto) {
    this.logger.info({ to: dto.to, subject: dto.subject }, '收到發送郵件請求');

    const result = await this.mailService.sendMail(dto);

    this.logger.info({ to: dto.to, messageId: result.messageId }, '郵件發送完成');

    return {
      message: '郵件已發送',
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    };
  }
}
