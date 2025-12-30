import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
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

  // 註冊全域 Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = configService.get<number>('port') || 8080;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}${apiPrefix}`);
}

bootstrap();
