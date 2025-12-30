import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { FirebaseModule } from './firebase/firebase.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', 'env.yaml'],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDevelopment = config.get('nodeEnv') === 'development';
        const logLevel = config.get('logging.level') || 'info';

        return {
          pinoHttp: {
            level: logLevel,
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
            customLogLevel: (req, res, err) => {
              if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
              if (res.statusCode >= 500 || err) return 'error';
              return 'info';
            },
          },
        };
      },
    }),
    FirebaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
