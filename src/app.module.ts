import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { MembersModule } from './members/members.module';
import { AdminsModule } from './admins/admins.module';
import { OrdersModule } from './orders/orders.module';
import { MailModule } from './mail/mail.module';
import { StorageModule } from './storage/storage.module';
import { FilesModule } from './files/files.module';
import { randomUUID } from 'crypto';

// Cloud Logging severity mapping
const SEVERITY_LOOKUP = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', 'env.yaml'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 秒
        limit: 10, // 最多 10 次請求
      },
    ]),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDevelopment = config.get('nodeEnv') === 'development';
        const logLevel = config.get('logging.level') || 'info';

        return {
          pinoHttp: {
            level: logLevel,
            messageKey: 'message',

            // Cloud Logging 格式化
            formatters: {
              level(label: string) {
                return {
                  severity: SEVERITY_LOOKUP[label] || 'INFO',
                };
              },
            },

            // ISO8601 時間格式
            timestamp: () => `,"time":"${new Date().toISOString()}"`,

            // 生成 Request ID (支援上游傳遞的 ID)
            genReqId: (req: any, res: any) => {
              const existingID = req.id ?? req.headers['x-request-id'];
              if (existingID) {
                return existingID;
              }
              const id = randomUUID();
              req.headers['x-request-id'] = id;
              res.setHeader('X-Request-ID', id);
              return id;
            },

            // 自定義屬性（如用戶信息）
            customProps: (req: any) => {
              const props: any = {};
              if (req.user) {
                props.user = {
                  uid: req.user.uid,
                  email: req.user.email,
                };
              }
              return props;
            },

            // 自定義日誌級別
            customLogLevel: (req, res, err) => {
              if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
              if (res.statusCode >= 500 || err) return 'error';
              return 'info';
            },

            // 自訂成功請求的額外日誌資料
            // 在響應完成後補充 params 和 query（此時路由參數已解析）
            customSuccessObject: (req: any, res, loggableObject) => {
              return {
                reqParams: req.params,
                reqQuery: req.query,
                reqBody: req.body,
              };
            },

            // 自訂錯誤請求的額外日誌資料
            // 在響應完成後補充 params 和 query（此時路由參數已解析）
            customErrorObject: function (req: any, res, err, loggableObject) {
              return {
                reqParams: req.params,
                reqQuery: req.query,
                reqBody: req.body,
              };
            },

            // 自定義序列化器
            serializers: {
              req: (req: any) => ({
                method: req.method,
                url: req.url,
                headers: {
                  'user-agent': req.headers['user-agent'],
                  'accept': req.headers['accept'],
                  'x-request-id': req.headers['x-request-id'],
                },
              }),
              res: (res: any) => ({
                statusCode: res.statusCode,
              }),
            },

            // 開發環境使用 pino-pretty
            transport: isDevelopment
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                    singleLine: false,
                  },
                }
              : undefined,
            autoLogging: true,
          },
        };
      },
    }),
    FirebaseModule,
    AuthModule,
    ProductsModule,
    MembersModule,
    AdminsModule,
    OrdersModule,
    MailModule,
    StorageModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
