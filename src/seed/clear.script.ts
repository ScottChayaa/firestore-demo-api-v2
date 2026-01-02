import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module';
import { SeedService } from './seed.service';

async function bootstrap() {
  // 環境保護：禁止在 production 環境執行
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Clear is not allowed in production environment!');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['error', 'warn'],
  });

  const seedService = app.get(SeedService);

  try {
    console.log('🗑️  Starting clear...\n');
    await seedService.clearData();
    console.log('\n✅ Clear completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Clear failed:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
