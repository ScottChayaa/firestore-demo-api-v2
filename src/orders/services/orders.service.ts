import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersRepository } from '../repositories/orders.repository';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrderQueryDto } from '../dto/order-query.dto';
import { Order } from '../entities/order.entity';
import { PaginationResult } from '../../common/pagination/pagination.interface';

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepo: OrdersRepository) {}

  /**
   * 建立訂單
   * 驗證訂單資料並建立新訂單
   */
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // 驗證訂單項目不為空
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('訂單至少需要一個項目');
    }

    // 驗證所有項目的價格和數量都有效
    for (const item of dto.items) {
      if (item.price < 0) {
        throw new BadRequestException(`商品 ${item.productName} 價格不能為負數`);
      }
      if (item.quantity < 1) {
        throw new BadRequestException(`商品 ${item.productName} 數量至少為 1`);
      }
    }

    return this.ordersRepo.create(dto);
  }

  /**
   * 查詢訂單列表
   * 支援分頁、篩選、排序
   */
  async getOrders(query: OrderQueryDto): Promise<PaginationResult<Order>> {
    return this.ordersRepo.findAll(query);
  }

  /**
   * 取得單一訂單詳情
   */
  async getOrder(id: string): Promise<Order> {
    const order = await this.ordersRepo.findById(id);
    if (!order) {
      throw new NotFoundException(`找不到訂單 ID: ${id}`);
    }
    return order;
  }

  /**
   * 更新訂單（主要用於更新狀態）
   */
  async updateOrder(id: string, dto: UpdateOrderDto): Promise<Order> {
    // 檢查訂單是否存在
    const order = await this.ordersRepo.findById(id);
    if (!order) {
      throw new NotFoundException(`找不到訂單 ID: ${id}`);
    }

    // 驗證狀態轉換的合理性
    if (dto.status) {
      this.validateStatusTransition(order.status, dto.status);
    }

    return this.ordersRepo.update(id, dto);
  }

  /**
   * 刪除訂單
   */
  async deleteOrder(id: string): Promise<void> {
    // 檢查訂單是否存在
    const order = await this.ordersRepo.findById(id);
    if (!order) {
      throw new NotFoundException(`找不到訂單 ID: ${id}`);
    }

    // 檢查訂單狀態（可選：只允許刪除特定狀態的訂單）
    if (order.status === 'processing') {
      throw new BadRequestException('處理中的訂單無法刪除');
    }

    await this.ordersRepo.delete(id);
  }

  /**
   * 驗證訂單狀態轉換的合理性
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): void {
    // 定義允許的狀態轉換
    const allowedTransitions: Record<string, string[]> = {
      pending: ['processing', 'cancelled'],
      processing: ['completed', 'cancelled'],
      completed: [], // 已完成的訂單不能再轉換
      cancelled: [], // 已取消的訂單不能再轉換
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `無法將訂單狀態從 ${currentStatus} 變更為 ${newStatus}`,
      );
    }
  }
}
