import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Order, OrderItem } from '../entities/order.entity';
import { OrderQueryDto } from '../dto/order-query.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { PaginationHelper } from '../../common/pagination/pagination.helper';
import { PaginationResult } from '../../common/pagination/pagination.interface';

@Injectable()
export class OrdersRepository {
  private readonly collection: admin.firestore.CollectionReference;

  constructor(
    @Inject('FIRESTORE') private readonly firestore: admin.firestore.Firestore,
  ) {
    this.collection = this.firestore.collection('orders');
  }

  /**
   * 建立訂單
   * 自動生成訂單編號和設定時間戳
   */
  async create(
    data: Omit<Order, 'id' | 'orderNumber' | 'totalAmount' | 'status' | 'createdAt' | 'updatedAt'>,
  ): Promise<Order> {
    const orderNumber = this.generateOrderNumber();
    const now = admin.firestore.Timestamp.now();

    // 將 DTO 類實例轉換為純物件（Firestore 不支援帶有類原型的物件）
    const plainItems = data.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
    }));

    // 計算訂單總金額
    const totalAmount = plainItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const orderData = {
      orderNumber,
      memberId: data.memberId,
      items: plainItems,
      totalAmount,
      status: 'pending' as const,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.collection.add(orderData);
    const doc = await docRef.get();
    return this.mapToEntity(doc);
  }

  /**
   * 根據 ID 取得訂單
   */
  async findById(id: string): Promise<Order | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return this.mapToEntity(doc);
  }

  /**
   * 查詢訂單列表（分頁、篩選、排序）
   */
  async findAll(queryDto: OrderQueryDto): Promise<PaginationResult<Order>> {
    let query: admin.firestore.Query = this.collection;

    // 會員篩選
    if (queryDto.memberId) {
      query = query.where('memberId', '==', queryDto.memberId);
    }

    // 狀態篩選
    if (queryDto.status) {
      query = query.where('status', '==', queryDto.status);
    }

    // 日期範圍篩選
    if (queryDto.startDate) {
      const startTimestamp = admin.firestore.Timestamp.fromDate(
        new Date(queryDto.startDate),
      );
      query = query.where('createdAt', '>=', startTimestamp);
    }

    if (queryDto.endDate) {
      const endTimestamp = admin.firestore.Timestamp.fromDate(
        new Date(queryDto.endDate),
      );
      query = query.where('createdAt', '<=', endTimestamp);
    }

    // 金額範圍篩選
    if (queryDto.minAmount !== undefined) {
      query = query.where('totalAmount', '>=', queryDto.minAmount);
    }

    if (queryDto.maxAmount !== undefined) {
      query = query.where('totalAmount', '<=', queryDto.maxAmount);
    }

    // 排序
    const orderBy = queryDto.orderBy || 'createdAt';
    const order = queryDto.order || 'desc';
    query = query.orderBy(orderBy, order);

    // 分頁
    return PaginationHelper.paginate<Order>(
      query,
      {
        cursor: queryDto.cursor,
        limit: queryDto.limit,
      },
      (doc) => this.mapToEntity(doc),
    );
  }

  /**
   * 更新訂單
   * 自動更新 updatedAt
   */
  async update(
    id: string,
    data: Partial<Omit<Order, 'id' | 'createdAt' | 'orderNumber'>>,
  ): Promise<Order> {
    const updateData = {
      ...data,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await this.collection.doc(id).update(updateData);

    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到訂單 ID: ${id}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 刪除訂單
   */
  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  /**
   * 生成訂單編號
   * 格式：ORD-YYYYMMDD-XXXXX
   */
  private generateOrderNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ORD-${dateStr}-${random}`;
  }

  /**
   * 私有方法：映射 Firestore Document 到 Order Entity
   */
  private mapToEntity(doc: admin.firestore.DocumentSnapshot): Order {
    const data = doc.data();
    if (!data) {
      throw new NotFoundException('訂單資料不存在');
    }

    return {
      id: doc.id,
      orderNumber: data.orderNumber,
      memberId: data.memberId,
      items: data.items as OrderItem[],
      totalAmount: data.totalAmount,
      status: data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }
}
