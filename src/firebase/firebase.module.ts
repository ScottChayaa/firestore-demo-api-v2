import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import {
  FIREBASE_APP,
  FIRESTORE,
  FIREBASE_AUTH,
  STORAGE,
} from './firebase.constants';

/**
 * 全域 Firebase 模組
 */
@Global()
@Module({
  providers: [
    {
      provide: FIREBASE_APP,
      useFactory: (configService: ConfigService, logger: PinoLogger) => {
        logger.setContext('FirebaseModule');

        try {
          let credentials: any;

          // 方式 1：從 Base64 環境變數讀取（Cloud Run 部署）
          const credentialsBase64 = configService.get<string>(
            'firebase.credentialsBase64',
          );

          // 方式 2：從文件路徑讀取（本地開發）
          const credentialsPath = configService.get<string>(
            'firebase.credentialsPath',
          );

          if (credentialsBase64) {
            logger.info('已從 env 讀取 Firebas Base64 憑證');
            credentials = JSON.parse(
              Buffer.from(credentialsBase64, 'base64').toString('utf-8'),
            );
          } else if (credentialsPath) {
            logger.info(`已從檔案: ${credentialsPath} 讀取 Firebase 憑證`);
            const credentialsFile = readFileSync(credentialsPath, 'utf-8');
            credentials = JSON.parse(credentialsFile);
          } else {
            logger.warn(
              '找不到 Firebase 憑證 (請設定 GOOGLE_CREDENTIALS_BASE64 或 GOOGLE_CREDENTIALS_PATH)',
            );
            return null;
          }

          const projectId = configService.get<string>('firebase.projectId') || credentials.project_id;

          return admin.initializeApp({
            credential: admin.credential.cert(credentials),
            databaseURL: `https://${projectId}.firebaseio.com`,
          });
        } catch (error) {
          logger.error({ err: error }, 'Firebase Admin SDK 初始化失敗');
          return null;
        }
      },
      inject: [ConfigService, PinoLogger],
    },
    {
      provide: FIRESTORE,
      useFactory: (app: admin.app.App | null, configService: ConfigService, logger: PinoLogger) => {
        logger.setContext('FirebaseModule');

        if (!app) {
          logger.warn('Firestore 異常 (Firebase 尚未初始化)');
          return null;
        }

        const databaseId = configService.get<string>('firebase.databaseId');
        const db = app.firestore();

        // 設置 database ID（如果不是 default）
        if (databaseId && databaseId !== '(default)') {
          db.settings({
            databaseId,
            ignoreUndefinedProperties: true,  // 全域忽略 undefined (create 資料時忽略 undefined 參數)
          });
          logger.info(`初始化 Firestore DB 連線 : ${databaseId}`);
        } else {
          logger.info('初始化 Firestore DB 連線 : (default)');
        }

        return db;
      },
      inject: [FIREBASE_APP, ConfigService, PinoLogger],
    },
    {
      provide: FIREBASE_AUTH,
      useFactory: (app: admin.app.App | null, logger: PinoLogger) => {
        logger.setContext('FirebaseModule');

        if (!app) {
          logger.warn(
            'Firebase Auth 異常 (Firebase 尚未初始化)',
          );
          return null;
        }

        const auth = app.auth();
        logger.info('Firebase Auth 已初始化');
        return auth;
      },
      inject: [FIREBASE_APP, PinoLogger],
    },
    {
      provide: STORAGE,
      useFactory: (app: admin.app.App | null, configService: ConfigService, logger: PinoLogger) => {
        logger.setContext('FirebaseModule');

        if (!app) {
          logger.warn(
            'Firebase Storage 異常 (Firebase 尚未初始化)',
          );
          return null;
        }

        const bucketName = configService.get<string>('storage.bucketName');
        const bucket = app.storage().bucket(bucketName);
        logger.info(`Firebase Storage 已初始化 bucket: ${bucketName}`);
        return bucket;
      },
      inject: [FIREBASE_APP, ConfigService, PinoLogger],
    },
  ],
  exports: [FIREBASE_APP, FIRESTORE, FIREBASE_AUTH, STORAGE],
})
export class FirebaseModule {}
