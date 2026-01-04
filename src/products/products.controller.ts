import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { PinoLogger } from 'nestjs-pino';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly logger: PinoLogger,
  ) {}

  /**
   * 取得商品列表（公開 API - 無需驗證）
   * GET /api/products?limit=20&cursor=abc&category=electronics&minPrice=100
   */
  @Public()
  @Get()
  async getProducts(@Query() query: ProductQueryDto) {
    this.logger.info({ query }, '取得商品列表請求');
    const result = await this.productsService.findAll(query);
    this.logger.info({ count: result.data.length }, '取得商品列表成功');
    return result;
  }

  /**
   * 取得商品分類列表（公開 API - 無需驗證）
   * GET /api/products/categories
   */
  @Public()
  @Get('categories')
  async getCategories() {
    this.logger.info('取得商品分類列表請求');
    const categories = await this.productsService.getCategories();
    this.logger.info({ count: categories.length }, '取得商品分類列表成功');
    return categories;
  }

  /**
   * 取得單一商品詳情（公開 API - 無需驗證）
   * GET /api/products/:id
   */
  @Public()
  @Get(':id')
  async getProductById(@Param('id') id: string) {
    this.logger.info({ productId: id }, '取得單一商品請求');
    const product = await this.productsService.findOne(id);
    this.logger.info({ productId: id }, '取得單一商品成功');
    return product;
  }
}
