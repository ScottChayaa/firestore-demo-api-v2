import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

/**
 * ValidationException Filter
 * 處理 validation 錯誤並記錄詳細的 logger
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(ValidationExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    // 判斷是否為 validation 錯誤（有 errors 欄位）
    if (exceptionResponse.errors) {
      // 記錄詳細的 validation 錯誤
      this.logger.warn(
        {
          type: 'ValidationError',
          method: request.method,
          url: request.url,
          errors: exceptionResponse.errors,
          query: request.query,
          body: request.body,
        },
        'Validation failed',
      );

      response.status(status).json({
        statusCode: status,
        message: exceptionResponse.message || '請求參數驗證失敗',
        errors: exceptionResponse.errors,
      });
    } else {
      // 一般的 BadRequestException
      this.logger.warn(
        {
          type: 'BadRequest',
          method: request.method,
          url: request.url,
          message: exceptionResponse.message || exception.message,
        },
        'Bad request',
      );

      response.status(status).json({
        statusCode: status,
        message: exceptionResponse.message || exception.message,
      });
    }
  }
}
