import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendMailDto } from './dto/send-mail.dto';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

/**
 * 郵件服務
 * 使用 Nodemailer 發送郵件
 */
@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private fromName: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(MailService.name)
    private readonly logger: PinoLogger,
  ) {
    // 初始化 Nodemailer Transporter
    const host = this.configService.get<string>('smtp.host');
    const port = this.configService.get<number>('smtp.port');
    const user = this.configService.get<string>('smtp.user');
    const pass = this.configService.get<string>('smtp.password');
    this.fromEmail = this.configService.get<string>('smtp.fromEmail');
    this.fromName = this.configService.get<string>('smtp.fromName');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // SSL 需要 port 465
      auth: {
        user,
        pass,
      },
    });

    this.logger.info(
      { host, port, user, fromEmail: this.fromEmail },
      'Nodemailer Transporter 已初始化',
    );
  }

  /**
   * 發送郵件
   * @param dto - 郵件資料
   * @returns 發送結果（包含 messageId）
   */
  async sendMail(dto: SendMailDto): Promise<{
    messageId: string;
    accepted: string[];
    rejected: string[];
  }> {
    this.logger.info({ to: dto.to, subject: dto.subject }, '準備發送郵件');

    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.info(
        { to: dto.to, messageId: info.messageId },
        '郵件發送成功',
      );

      return {
        messageId: info.messageId,
        accepted: info.accepted as string[],
        rejected: info.rejected as string[],
      };
    } catch (error) {
      this.logger.error({ to: dto.to, error: error.message }, '郵件發送失敗');
      throw new InternalServerErrorException('郵件發送失敗');
    }
  }

  /**
   * 發送密碼重置郵件
   * @param email - 收件人電子郵件
   * @param resetLink - 重置密碼連結
   */
  async sendPasswordResetEmail(
    email: string,
    resetLink: string,
  ): Promise<void> {
    this.logger.info({ email }, '發送密碼重置郵件');

    await this.sendMail({
      to: email,
      subject: '重設密碼',
      html: `
        <h2>重設密碼</h2>
        <p>您好，</p>
        <p>我們收到了您的密碼重設請求。請點擊以下連結重設密碼：</p>
        <p><a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">重設密碼</a></p>
        <p>或複製以下連結到瀏覽器：</p>
        <p>${resetLink}</p>
        <p>此連結將在 1 小時後過期。</p>
        <p>如果您沒有請求重設密碼，請忽略此郵件。</p>
        <br>
        <p>祝好，</p>
        <p>${this.fromName}</p>
      `,
      text: `
重設密碼

您好，

我們收到了您的密碼重設請求。請點擊以下連結重設密碼：
${resetLink}

此連結將在 1 小時後過期。

如果您沒有請求重設密碼，請忽略此郵件。

祝好，
${this.fromName}
      `,
    });
  }

  /**
   * 發送歡迎郵件（會員註冊）
   * @param email - 收件人電子郵件
   * @param name - 會員名稱
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    this.logger.info({ email, name }, '發送歡迎郵件');

    await this.sendMail({
      to: email,
      subject: '歡迎加入！',
      html: `
        <h2>歡迎加入 ${this.fromName}！</h2>
        <p>親愛的 ${name}，</p>
        <p>感謝您註冊成為我們的會員。我們很高興您加入我們的社群！</p>
        <p>您現在可以開始探索我們的商品和服務。</p>
        <br>
        <p>祝好，</p>
        <p>${this.fromName} 團隊</p>
      `,
      text: `
歡迎加入 ${this.fromName}！

親愛的 ${name}，

感謝您註冊成為我們的會員。我們很高興您加入我們的社群！

您現在可以開始探索我們的商品和服務。

祝好，
${this.fromName} 團隊
      `,
    });
  }
}
