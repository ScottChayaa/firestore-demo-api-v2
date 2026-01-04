import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { join } from 'path';

export default () => {
  // 嘗試讀取 env.yaml（Cloud Run 環境）
  let yamlConfig = {};
  try {
    const yamlPath = join(process.cwd(), 'env.yaml');
    const yamlFile = readFileSync(yamlPath, 'utf8');
    yamlConfig = load(yamlFile) as Record<string, any>;
  } catch (e) {
    // env.yaml 不存在，使用 .env
  }

  // 合併配置（env.yaml 優先，然後是 process.env）
  const config: Record<string, any> = {
    ...yamlConfig,
    ...process.env,
  };

  return {
    // Server Configuration
    port: parseInt(config.PORT, 10) || 8080,
    nodeEnv: config.NODE_ENV || 'development',
    imageVersion: config.IMAGE_VERSION || '0.0.1',

    // API Configuration
    apiPrefix: config.API_PREFIX || '/api',
    corsOrigin: config.CORS_ORIGIN || '*',

    // Logging Configuration
    logging: {
      level: config.LOG_LEVEL || 'info',
      logResponseBody: config.LOG_RESPONSE_BODY === 'true',
      maxResponseBodyLength:
        parseInt(config.MAX_RESPONSE_BODY_LENGTH, 10) || 10000,
    },

    // Firebase Configuration
    firebase: {
      projectId: config.FIREBASE_PROJECT_ID,
      webApiKey: config.FIREBASE_WEB_API_KEY,
      databaseId: config.FIRESTORE_DATABASE_ID || '(default)',
      credentialsBase64: config.GOOGLE_CREDENTIALS_BASE64,
      credentialsPath: config.GOOGLE_CREDENTIALS_PATH,
      enableWarmup: config.ENABLE_FIRESTORE_WARMUP === 'true',
    },

    // Pagination Configuration
    pagination: {
      defaultLimit: parseInt(config.DEFAULT_PAGE_LIMIT, 10) || 20,
      maxLimit: parseInt(config.MAX_PAGE_LIMIT, 10) || 100,
    },

    // SMTP Configuration (Mail Service)
    smtp: {
      host: config.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(config.SMTP_PORT, 10) || 587,
      user: config.SMTP_USER,
      password: config.SMTP_PASSWORD,
      fromEmail: config.SMTP_FROM_EMAIL,
      fromName: config.SMTP_FROM_NAME || 'Firestore Demo API',
    },

    // Rate Limiting Configuration
    rateLimit: {
      emailLimitMinutes: parseInt(config.EMAIL_RATE_LIMIT_MINUTES, 10) || 2,
      emailMaxRequestsPerDay:
        parseInt(config.EMAIL_MAX_REQUESTS_PER_DAY, 10) || 50,
    },

    // Seed Data Configuration
    seed: {
      membersCount: parseInt(config.SEED_MEMBERS_COUNT, 10) || 100,
      ordersCount: parseInt(config.SEED_ORDERS_COUNT, 10) || 500,
      productsCount: parseInt(config.SEED_PRODUCTS_COUNT, 10) || 50,
    },
  };
};
