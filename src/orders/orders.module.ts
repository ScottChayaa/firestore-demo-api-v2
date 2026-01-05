import { Module } from '@nestjs/common';
import { OrdersService } from './services/orders.service';
import { OrdersRepository } from './repositories/orders.repository';
import { OrdersAdminController } from './controllers/orders-admin.controller';
import { OrdersMemberController } from './controllers/orders-member.controller';

/**
 * 訂單模組
 * 提供訂單的完整 CRUD 功能
 * - 管理員可以管理所有訂單（查詢、建立、更新、刪除）
 * - 會員可以查詢自己的訂單
 */
@Module({
  controllers: [OrdersAdminController, OrdersMemberController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService], // 匯出 Service 供其他模組使用（例如 Mail Module）
})
export class OrdersModule {}
