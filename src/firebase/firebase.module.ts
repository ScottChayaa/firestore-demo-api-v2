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
            logger.info('Loading Firebase credentials from Base64 environment variable');
            credentials = JSON.parse(
              Buffer.from(credentialsBase64, 'base64').toString('utf-8'),
            );
          } else if (credentialsPath) {
            logger.info(`Loading Firebase credentials from file: ${credentialsPath}`);
            const credentialsFile = readFileSync(credentialsPath, 'utf-8');
            credentials = JSON.parse(credentialsFile);
          } else {
            logger.warn(
              'Firebase credentials not found (set GOOGLE_CREDENTIALS_BASE64 or GOOGLE_CREDENTIALS_PATH)',
            );
            return null;
          }

          const projectId = configService.get<string>('firebase.projectId') || credentials.project_id;

          return admin.initializeApp({
            credential: admin.credential.cert(credentials),
            databaseURL: `https://${projectId}.firebaseio.com`,
          });
        } catch (error) {
          logger.error({ err: error }, 'Failed to initialize Firebase Admin SDK');
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
          logger.warn('Firestore not available (Firebase not initialized)');
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
          logger.info(`Firestore connected to database: ${databaseId}`);
        } else {
          logger.info('Firestore connected to (default) database');
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
            'Firebase Auth not available (Firebase not initialized)',
          );
          return null;
        }

        const auth = app.auth();
        logger.info('Firebase Auth initialized successfully');
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
            'Firebase Storage not available (Firebase not initialized)',
          );
          return null;
        }

        const bucketName = configService.get<string>('storage.bucketName');
        const bucket = app.storage().bucket(bucketName);
        logger.info(`Firebase Storage initialized with bucket: ${bucketName}`);
        return bucket;
      },
      inject: [FIREBASE_APP, ConfigService, PinoLogger],
    },
  ],
  exports: [FIREBASE_APP, FIRESTORE, FIREBASE_AUTH, STORAGE],
})
export class FirebaseModule {}
