import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
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
    queryDto: ProductQueryDto | AdminProductQueryDto,
  ): Promise<PaginationResult<Product>> {
    let firestoreQuery: admin.firestore.Query =
      this.firestore.collection('products');

    // 檢查是否為管理端查詢
    const isAdminQuery = 'includeDeleted' in queryDto || 'isActive' in queryDto;

    // 前台查詢自動排除已刪除和停用的產品
    if (!isAdminQuery) {
      firestoreQuery = firestoreQuery.where('deletedAt', '==', null);
      firestoreQuery = firestoreQuery.where('isActive', '==', true);
    } else {
      // 管理端查詢：根據參數決定
      const adminQuery = queryDto as AdminProductQueryDto;

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
    }

    // 分類篩選（前台和後台共用，等值查詢不衝突）
    if (queryDto.category) {
      firestoreQuery = firestoreQuery.where('category', '==', queryDto.category);
    }

    // 檢查範圍查詢互斥（Firestore 限制：只能對單一欄位進行範圍查詢）
    const hasNameSearch = !!queryDto.name;
    const hasPriceRange = !!(queryDto.minPrice !== undefined || queryDto.maxPrice !== undefined);
    const hasStockRange = isAdminQuery && !!(
      (queryDto as AdminProductQueryDto).minStock !== undefined ||
      (queryDto as AdminProductQueryDto).maxStock !== undefined
    );

    const rangeQueryCount = [hasNameSearch, hasPriceRange, hasStockRange].filter(Boolean).length;
    if (rangeQueryCount > 1) {
      const activeQueries = [];
      if (hasNameSearch) activeQueries.push('name');
      if (hasPriceRange) activeQueries.push('minPrice/maxPrice');
      if (hasStockRange) activeQueries.push('minStock/maxStock');

      throw new BadRequestException(
        `範圍查詢功能無法同時使用（Firestore 限制：範圍查詢只能用於單一欄位）。` +
        `目前提供的範圍查詢：${activeQueries.join('、')}。` +
        `請僅選擇其中一個使用。`
      );
    }

    // 名稱搜尋（前台和後台共用）
    // 注意：Firestore 的搜尋功能有限，這裡只做前綴搜尋
    // 更好的方案是使用 Algolia 或 Elasticsearch
    if (hasNameSearch) {
      firestoreQuery = firestoreQuery
        .where('name', '>=', queryDto.name)
        .where('name', '<=', queryDto.name + '\uf8ff');

      // 使用搜尋時，第一個 orderBy 必須是 name（Firestore 限制）
      firestoreQuery = firestoreQuery.orderBy('name', 'asc');
    } else if (hasPriceRange) {
      // 價格篩選（前台和後台共用）
      if (queryDto.minPrice !== undefined) {
        firestoreQuery = firestoreQuery.where('price', '>=', queryDto.minPrice);
      }
      if (queryDto.maxPrice !== undefined) {
        firestoreQuery = firestoreQuery.where('price', '<=', queryDto.maxPrice);
      }

      // 排序
      const orderBy = queryDto.orderBy || 'createdAt';
      const order = queryDto.order || 'desc';
      firestoreQuery = firestoreQuery.orderBy(orderBy, order);
    } else if (hasStockRange) {
      // 庫存篩選（僅管理端）
      const adminQuery = queryDto as AdminProductQueryDto;
      if (adminQuery.minStock !== undefined) {
        firestoreQuery = firestoreQuery.where('stock', '>=', adminQuery.minStock);
      }
      if (adminQuery.maxStock !== undefined) {
        firestoreQuery = firestoreQuery.where('stock', '<=', adminQuery.maxStock);
      }

      // 排序
      const orderBy = queryDto.orderBy || 'createdAt';
      const order = queryDto.order || 'desc';
      firestoreQuery = firestoreQuery.orderBy(orderBy, order);
    } else {
      // 沒有範圍查詢時的排序
      const orderBy = queryDto.orderBy || 'createdAt';
      const order = queryDto.order || 'desc';
      firestoreQuery = firestoreQuery.orderBy(orderBy, order);
    }

    // 執行分頁查詢（使用 mapToEntity 转换 Firestore Timestamp 为 Date）
    return PaginationHelper.paginate<Product>(
      firestoreQuery,
      'products',
      {
        cursor: queryDto.cursor,
        limit: queryDto.limit,
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
