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
        let exResponse: any = exceptionResponse as any;
        message = exResponse.message || exceptionResponse;
        errors = exResponse.errors; // 保留 errors 欄位（用於 validation 錯誤）
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
      // ValidationError 詳細記錄
      this.logger.warn(
        {
          type: (exception as Error).name,
          errors,
        },
        'Validation failed',
      );
    } else {
      // 一般錯誤記錄
      if (exception instanceof Error) {
        this.logger.error(
          {
            type: exception.name,
            stack: exception.stack?.split('\n')
          },
          'Exception occurred'
        );
      }
      else {
        this.logger.error('Exception unknown');
      }
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
