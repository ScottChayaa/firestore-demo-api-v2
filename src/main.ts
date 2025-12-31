import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // 使用 Pino Logger
  app.useLogger(app.get(Logger));

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
        enableImplicitConversion: true, // 啟用隱式轉換（query params）
      },
    }),
  );

  // 註冊全域 Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = configService.get<number>('port') || 8080;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}${apiPrefix}`);
}

bootstrap();
