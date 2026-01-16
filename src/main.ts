import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { validationExceptionFactory } from './common/factories/validation-exception.factory';
import helmet from 'helmet';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false, // 關閉 NestJS 系統日誌（路由映射等訊息）
  });

  // 配置靜態檔案服務（用於測試頁面）
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // 取得 ConfigService
  const configService = app.get(ConfigService);

  // 安全性設定 - Helmet
  app.use(helmet());

  // CORS 配置
  app.enableCors({
    origin: configService.get<string>('corsOrigin') || '*',
    credentials: true,
  });

  // 全域前綴
  const apiPrefix = configService.get<string>('apiPrefix') || '/api';
  app.setGlobalPrefix(apiPrefix);

  // 全域 ValidationPipe（取代 express-validator）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自動移除未定義的屬性
      forbidNonWhitelisted: true, // 如果有未定義的屬性，拋出錯誤
      transform: true, // 自動轉換型別
      transformOptions: {
        enableImplicitConversion: false, // 禁用隱式轉換，使用顯式 @Type() 和 @Transform()
      },
      exceptionFactory: validationExceptionFactory, // 自訂錯誤格式
    }),
  );

  // 註冊全域 Exception Filter
  // 注意：更具體的 Filter 應該先註冊
  app.useGlobalFilters(
    new ThrottlerExceptionFilter(),
    new AllExceptionsFilter(), // 處理所有異常（包含 validation 錯誤）
  );

  const port = configService.get<number>('port') || 8080;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}${apiPrefix}`);
}

bootstrap();
