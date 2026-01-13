import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exceptionResponse;
        // 🆕 保留 errors 欄位（用於 validation 錯誤）
        errors = (exceptionResponse as any).errors;
      }
    } else if (exception instanceof Error) {
      message = exception.message;

      // Firebase 錯誤處理
      if (exception.name === 'FirebaseAuthError') {
        status = HttpStatus.UNAUTHORIZED;
      }
    }

    // 記錄錯誤
    if (errors) {
      // 🆕 ValidationError 詳細記錄
      this.logger.warn(
        {
          type: 'ValidationError',
          method: request.method,
          url: request.url,
          errors,
          query: request.query,
          body: request.body,
        },
        'Validation failed',
      );
    } else {
      // 一般錯誤記錄
      this.logger.error(
        {
          stack: exception instanceof Error ? exception.stack?.split('\n') : undefined,
        },
        'Exception occurred',
      );
    }

    // 🆕 回傳時包含 errors（如果有的話）
    const responseBody: any = {
      statusCode: status,
      message,
    };

    if (errors) {
      responseBody.errors = errors;
    }

    response.status(status).json(responseBody);
  }
}
