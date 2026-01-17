import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('FirebaseModule');

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
            logger.log('Loading Firebase credentials from Base64 environment variable');
            credentials = JSON.parse(
              Buffer.from(credentialsBase64, 'base64').toString('utf-8'),
            );
          } else if (credentialsPath) {
            logger.log(`Loading Firebase credentials from file: ${credentialsPath}`);
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
          logger.error('Failed to initialize Firebase Admin SDK:', error);
          return null;
        }
      },
      inject: [ConfigService],
    },
    {
      provide: FIRESTORE,
      useFactory: (app: admin.app.App | null, configService: ConfigService) => {
        const logger = new Logger('FirebaseModule');

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
          logger.log(`Firestore connected to database: ${databaseId}`);
        } else {
          logger.log('Firestore connected to (default) database');
        }

        return db;
      },
      inject: [FIREBASE_APP, ConfigService],
    },
    {
      provide: FIREBASE_AUTH,
      useFactory: (app: admin.app.App | null) => {
        const logger = new Logger('FirebaseModule');

        if (!app) {
          logger.warn(
            'Firebase Auth not available (Firebase not initialized)',
          );
          return null;
        }

        const auth = app.auth();
        logger.log('Firebase Auth initialized successfully');
        return auth;
      },
      inject: [FIREBASE_APP],
    },
    {
      provide: STORAGE,
      useFactory: (app: admin.app.App | null, configService: ConfigService) => {
        const logger = new Logger('FirebaseModule');

        if (!app) {
          logger.warn(
            'Firebase Storage not available (Firebase not initialized)',
          );
          return null;
        }

        const bucketName = configService.get<string>('storage.bucketName');
        const bucket = app.storage().bucket(bucketName);
        logger.log(`Firebase Storage initialized with bucket: ${bucketName}`);
        return bucket;
      },
      inject: [FIREBASE_APP, ConfigService],
    },
  ],
  exports: [FIREBASE_APP, FIRESTORE, FIREBASE_AUTH, STORAGE],
})
export class FirebaseModule {}
