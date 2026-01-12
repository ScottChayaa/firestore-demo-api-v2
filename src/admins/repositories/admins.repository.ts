import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Admin } from '../entities/admin.entity';
import { AdminQueryDto } from '../dto/admin-query.dto';
import { PaginationHelper } from '../../common/pagination/pagination.helper';
import { PaginationResult } from '../../common/pagination/pagination.interface';

@Injectable()
export class AdminsRepository {
  private readonly collection: admin.firestore.CollectionReference;

  constructor(
    @Inject('FIRESTORE') private readonly firestore: admin.firestore.Firestore,
  ) {
    this.collection = this.firestore.collection('admins');
  }

  /**
   * 建立管理員記錄
   * 自動設定 createdAt 和 updatedAt
   */
  async create(
    uid: string,
    data: Omit<Admin, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Admin> {
    const now = admin.firestore.Timestamp.now();
    const adminData = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection.doc(uid).set(adminData);

    const doc = await this.collection.doc(uid).get();
    return this.mapToEntity(doc);
  }

  /**
   * 根據 UID 取得管理員
   * 預設排除已刪除的管理員（deletedAt !== null）
   */
  async findById(
    uid: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Admin | null> {
    const doc = await this.collection.doc(uid).get();

    if (!doc.exists) {
      return null;
    }

    const admin = this.mapToEntity(doc);

    // 預設排除已刪除的管理員
    if (!options?.includeDeleted && admin.deletedAt) {
      return null;
    }

    return admin;
  }

  /**
   * 根據 Email 查詢管理員
   */
  async findByEmail(
    email: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Admin | null> {
    let query: admin.firestore.Query = this.collection.where('email', '==', email);

    // 預設排除已刪除的管理員
    if (!options?.includeDeleted) {
      query = query.where('deletedAt', '==', null);
    }

    const snapshot = await query.limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    return this.mapToEntity(snapshot.docs[0]);
  }

  /**
   * 查詢管理員列表（分頁、篩選、排序）
   */
  async findAll(queryDto: AdminQueryDto): Promise<PaginationResult<Admin>> {
    let query: admin.firestore.Query = this.collection;

    // 預設排除已刪除的管理員
    if (!queryDto.includeDeleted) {
      query = query.where('deletedAt', '==', null);
    }

    // isActive 篩選
    if (queryDto.isActive !== undefined) {
      query = query.where('isActive', '==', queryDto.isActive);
    }

    // 檢查範圍查詢互斥（Firestore 限制：只能對單一欄位進行範圍查詢）
    const hasNameSearch = !!queryDto.name;
    const hasDateRange = !!(queryDto.startDate || queryDto.endDate);

    if (hasNameSearch && hasDateRange) {
      throw new BadRequestException(
        '名稱搜尋與日期範圍篩選無法同時使用（Firestore 限制：範圍查詢只能用於單一欄位）。' +
        '請選擇使用 name 或 startDate/endDate 其中之一。'
      );
    }

    // 名稱搜尋（前綴搜尋）
    // 注意：Firestore 的搜尋功能有限，這裡只做前綴搜尋
    // 更好的方案是使用 Algolia 或 Elasticsearch
    if (queryDto.name) {
      query = query
        .where('name', '>=', queryDto.name)
        .where('name', '<=', queryDto.name + '\uf8ff');

      // 使用搜尋時，第一個 orderBy 必須是 name（Firestore 限制）
      query = query.orderBy('name', 'asc');
    } else if (hasDateRange) {
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

      // 排序
      const orderBy = queryDto.orderBy || 'createdAt';
      const order = queryDto.order || 'desc';
      query = query.orderBy(orderBy, order);
    } else {
      // 沒有範圍查詢時的排序
      const orderBy = queryDto.orderBy || 'createdAt';
      const order = queryDto.order || 'desc';
      query = query.orderBy(orderBy, order);
    }

    // 分頁（使用 mapToEntity 轉換 Firestore Timestamp 為 Date）
    return PaginationHelper.paginate<Admin>(
      query,
      'admins',
      {
        cursor: queryDto.cursor,
        limit: queryDto.limit,
      },
      (doc) => this.mapToEntity(doc),
    );
  }

  /**
   * 更新管理員資料
   * 自動更新 updatedAt
   */
  async update(
    uid: string,
    data: Partial<Omit<Admin, 'id' | 'createdAt'>>,
  ): Promise<Admin> {
    const updateData = {
      ...data,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await this.collection.doc(uid).update(updateData);

    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到管理員 ID: ${uid}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 檢查 Email 是否已存在（排除已刪除的）
   */
  async emailExists(email: string): Promise<boolean> {
    const admin = await this.findByEmail(email, { includeDeleted: false });
    return admin !== null;
  }

  /**
   * 軟刪除管理員
   * 設定 deletedAt 和 deletedBy
   */
  async softDelete(uid: string, deletedBy: string): Promise<Admin> {
    const updateData = {
      deletedAt: admin.firestore.Timestamp.now(),
      deletedBy,
      isActive: false,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await this.collection.doc(uid).update(updateData);

    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到管理員 ID: ${uid}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 恢復已軟刪除的管理員
   * 清除 deletedAt 和 deletedBy
   */
  async restore(uid: string): Promise<Admin> {
    const updateData = {
      deletedAt: null,
      deletedBy: null,
      isActive: true,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await this.collection.doc(uid).update(updateData);

    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到管理員 ID: ${uid}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 切換管理員啟用/停用狀態
   */
  async toggleStatus(uid: string): Promise<Admin> {
    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到管理員 ID: ${uid}`);
    }

    const currentAdmin = this.mapToEntity(doc);
    const newStatus = !currentAdmin.isActive;

    const updateData = {
      isActive: newStatus,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await this.collection.doc(uid).update(updateData);

    const updatedDoc = await this.collection.doc(uid).get();
    return this.mapToEntity(updatedDoc);
  }

  /**
   * 私有方法：映射 Firestore Document 到 Admin Entity
   */
  private mapToEntity(doc: admin.firestore.DocumentSnapshot): Admin {
    const data = doc.data();
    if (!data) {
      throw new NotFoundException('管理員資料不存在');
    }

    return {
      id: doc.id,
      email: data.email,
      name: data.name,
      isActive: data.isActive,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      deletedAt: data.deletedAt?.toDate() || null,
      deletedBy: data.deletedBy || null,
    };
  }
}
