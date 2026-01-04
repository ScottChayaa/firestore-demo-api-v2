import { Injectable } from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepo: ProductsRepository) {}

  /**
   * 取得商品列表（支援分頁和篩選）
   */
  async findAll(query: ProductQueryDto) {
    return this.productsRepo.findAll(query);
  }

  /**
   * 取得單一商品詳情
   */
  async findOne(id: string) {
    return this.productsRepo.findById(id);
  }

  /**
   * 取得所有商品分類列表
   */
  async getCategories() {
    return this.productsRepo.getCategories();
  }
}
