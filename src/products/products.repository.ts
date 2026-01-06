import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Product } from './entities/product.entity';
import { ProductQueryDto } from './dto/product-query.dto';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { PaginationHelper } from '../common/pagination/pagination.helper';
import { PaginationResult } from '../common/pagination/pagination.interface';

@Injectable()
export class ProductsRepository {
  constructor(
    @Inject('FIRESTORE') private firestore: admin.firestore.Firestore,
  ) {}

  /**
   * 取得商品列表（支援分頁和篩選）
   * 支援前台和後台查詢
   */
  async findAll(
    query: ProductQueryDto | AdminProductQueryDto,
  ): Promise<PaginationResult<Product>> {
    let firestoreQuery: admin.firestore.Query =
      this.firestore.collection('products');

    // 檢查是否為管理端查詢
    const isAdminQuery = 'includeDeleted' in query || 'isActive' in query;

    // 前台查詢自動排除已刪除和停用的產品
    if (!isAdminQuery) {
      firestoreQuery = firestoreQuery.where('deletedAt', '==', null);
      firestoreQuery = firestoreQuery.where('isActive', '==', true);
    } else {
      // 管理端查詢：根據參數決定
      const adminQuery = query as AdminProductQueryDto;

      // 預設排除已刪除的產品
      if (!adminQuery.includeDeleted) {
        firestoreQuery = firestoreQuery.where('deletedAt', '==', null);
      }

      // isActive 篩選（僅管理端）
      if (adminQuery.isActive !== undefined) {
        firestoreQuery = firestoreQuery.where(
          'isActive',
          '==',
          adminQuery.isActive,
        );
      }

      // 庫存篩選（僅管理端）
      if (adminQuery.minStock !== undefined) {
        firestoreQuery = firestoreQuery.where(
          'stock',
          '>=',
          adminQuery.minStock,
        );
      }
      if (adminQuery.maxStock !== undefined) {
        firestoreQuery = firestoreQuery.where(
          'stock',
          '<=',
          adminQuery.maxStock,
        );
      }
    }

    // 分類篩選（前台和後台共用）
    if (query.category) {
      firestoreQuery = firestoreQuery.where('category', '==', query.category);
    }

    // 價格篩選（前台和後台共用）
    if (query.minPrice !== undefined) {
      firestoreQuery = firestoreQuery.where('price', '>=', query.minPrice);
    }
    if (query.maxPrice !== undefined) {
      firestoreQuery = firestoreQuery.where('price', '<=', query.maxPrice);
    }

    // 排序欄位（預設 createdAt）
    const orderBy = query.orderBy || 'createdAt';
    const order = query.order || 'desc';
    firestoreQuery = firestoreQuery.orderBy(orderBy, order);

    // 執行分頁查詢（使用 mapToEntity 转换 Firestore Timestamp 为 Date）
    return PaginationHelper.paginate<Product>(
      firestoreQuery,
      {
        cursor: query.cursor,
        limit: query.limit,
      },
      (doc) => this.mapToEntity(doc),
    );
  }

  /**
   * 根據 ID 取得單一商品
   */
  async findById(
    id: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Product> {
    const doc = await this.firestore.collection('products').doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`找不到產品 ID: ${id}`);
    }

    const product = this.mapToEntity(doc);

    // 前台預設排除已刪除和停用的產品
    if (!options?.includeDeleted) {
      if (product.deletedAt || !product.isActive) {
        throw new NotFoundException(`找不到產品 ID: ${id}`);
      }
    }

    return product;
  }

  /**
   * 取得所有商品分類列表
   */
  async getCategories(options?: { includeDeleted?: boolean }): Promise<string[]> {
    let query: admin.firestore.Query = this.firestore.collection('products');

    // 預設排除已刪除的產品
    if (!options?.includeDeleted) {
      query = query.where('deletedAt', '==', null);
    }

    const snapshot = await query.select('category').get();

    // 使用 Set 去重
    const categories = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const category = doc.data().category;
      if (category) {
        categories.add(category);
      }
    });

    return Array.from(categories).sort();
  }

  /**
   * 建立產品
   */
  async create(
    data: Omit<Product, 'id' | 'isActive' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'deletedBy'>,
  ): Promise<Product> {
    const docRef = this.firestore.collection('products').doc();

    const now = admin.firestore.Timestamp.now();
    const productData = {
      ...data,
      isActive: true, // 預設啟用
      deletedAt: null,
      deletedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(productData);

    const doc = await docRef.get();
    return this.mapToEntity(doc);
  }

  /**
   * 更新產品
   */
  async update(
    id: string,
    data: Partial<Omit<Product, 'id' | 'createdAt'>>,
  ): Promise<Product> {
    const docRef = this.firestore.collection('products').doc(id);

    const updateData = {
      ...data,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await docRef.update(updateData);

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到產品 ID: ${id}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 軟刪除產品
   */
  async softDelete(id: string, deletedBy: string): Promise<Product> {
    const docRef = this.firestore.collection('products').doc(id);

    await docRef.update({
      deletedAt: admin.firestore.Timestamp.now(),
      deletedBy: deletedBy,
      isActive: false, // 同時設定為停用
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到產品 ID: ${id}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 恢復已刪除產品
   */
  async restore(id: string): Promise<Product> {
    const docRef = this.firestore.collection('products').doc(id);

    await docRef.update({
      deletedAt: null,
      deletedBy: null,
      isActive: true, // 恢復時設定為啟用
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到產品 ID: ${id}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 切換產品啟用/停用狀態
   */
  async toggleStatus(id: string): Promise<Product> {
    const docRef = this.firestore.collection('products').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`找不到產品 ID: ${id}`);
    }

    const currentData = doc.data();
    const newIsActive = !currentData.isActive;

    await docRef.update({
      isActive: newIsActive,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const updatedDoc = await docRef.get();
    return this.mapToEntity(updatedDoc);
  }

  /**
   * 將 Firestore Document 映射到 Product Entity
   */
  private mapToEntity(doc: admin.firestore.DocumentSnapshot): Product {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      stock: data.stock,
      imageUrl: data.imageUrl,
      isActive: data.isActive ?? true, // 為現有產品提供預設值
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      deletedAt: data.deletedAt?.toDate() || null,
      deletedBy: data.deletedBy || null,
    };
  }
}
