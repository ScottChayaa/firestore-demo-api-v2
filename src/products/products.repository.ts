import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Product } from './entities/product.entity';
import { ProductQueryDto } from './dto/product-query.dto';
import { PaginationHelper } from '../common/pagination/pagination.helper';
import { PaginationResult } from '../common/pagination/pagination.interface';

@Injectable()
export class ProductsRepository {
  constructor(
    @Inject('FIRESTORE') private firestore: admin.firestore.Firestore,
  ) {}

  /**
   * 取得商品列表（支援分頁和篩選）
   */
  async findAll(query: ProductQueryDto): Promise<PaginationResult<Product>> {
    let firestoreQuery: admin.firestore.Query = this.firestore.collection('products');

    // 分類篩選
    if (query.category) {
      firestoreQuery = firestoreQuery.where('category', '==', query.category);
    }

    // 價格篩選
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
  async findById(id: string): Promise<Product> {
    const doc = await this.firestore.collection('products').doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`找不到商品 ID: ${id}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 取得所有商品分類列表
   */
  async getCategories(): Promise<string[]> {
    const snapshot = await this.firestore
      .collection('products')
      .select('category')
      .get();

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
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }
}
