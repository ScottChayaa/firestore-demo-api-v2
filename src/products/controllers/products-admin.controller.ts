import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProductsAdminService } from '../services/products-admin.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { AdminProductQueryDto } from '../dto/admin-product-query.dto';
import { Product } from '../entities/product.entity';
import { PaginationResult } from '../../common/pagination/pagination.interface';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as admin from 'firebase-admin';

@Controller('admin/products')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('admin')
export class ProductsAdminController {
  constructor(
    private readonly productsAdminService: ProductsAdminService,
    @InjectPinoLogger(ProductsAdminController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * GET /api/admin/products
   * 查詢產品列表（分頁、篩選、排序、軟刪除包含選項）
   */
  @Get()
  async getProducts(
    @Query() query: AdminProductQueryDto,
  ): Promise<PaginationResult<Product>> {
    this.logger.info({ query }, '查詢產品列表請求');
    const result = await this.productsAdminService.getProducts(query);
    this.logger.info({ count: result.data.length }, '查詢產品列表成功');
    return result;
  }

  /**
   * POST /api/admin/products
   * 建立產品
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Body() dto: CreateProductDto) {
    this.logger.info({ name: dto.name, category: dto.category }, '建立產品請求');
    const product = await this.productsAdminService.createProduct(dto);
    this.logger.info({ productId: product.id, name: product.name }, '建立產品成功');
    return {
      message: '產品建立成功',
      product,
    };
  }

  /**
   * GET /api/admin/products/categories
   * 取得所有分類
   */
  @Get('categories')
  async getCategories(
    @Query('includeDeleted') includeDeleted?: string,
  ): Promise<string[]> {
    this.logger.info({ includeDeleted }, '取得所有分類請求');
    const categories = await this.productsAdminService.getCategories({
      includeDeleted: includeDeleted === 'true',
    });
    this.logger.info({ count: categories.length }, '取得所有分類成功');
    return categories;
  }

  /**
   * GET /api/admin/products/:id
   * 取得單一產品詳情
   */
  @Get(':id')
  async getProduct(
    @Param('id') id: string,
    @Query('includeDeleted') includeDeleted?: string,
  ): Promise<Product> {
    this.logger.info({ productId: id, includeDeleted }, '取得單一產品請求');
    const product = await this.productsAdminService.getProduct(id, {
      includeDeleted: includeDeleted === 'true',
    });
    this.logger.info({ productId: id }, '取得單一產品成功');
    return product;
  }

  /**
   * PUT /api/admin/products/:id
   * 更新產品資料
   */
  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    this.logger.info({ productId: id, updateData: dto }, '更新產品資料請求');
    const product = await this.productsAdminService.updateProduct(id, dto);
    this.logger.info({ productId: id }, '更新產品資料成功');
    return product;
  }

  /**
   * DELETE /api/admin/products/:id
   * 軟刪除產品
   */
  @Delete(':id')
  async deleteProduct(
    @Param('id') id: string,
    @CurrentUser() user: admin.auth.DecodedIdToken,
  ) {
    this.logger.info({ productId: id, adminUid: user.uid }, '刪除產品請求');
    await this.productsAdminService.deleteProduct(id, user.uid);
    this.logger.info({ productId: id }, '刪除產品成功');
    return {
      message: '產品已刪除',
    };
  }

  /**
   * POST /api/admin/products/:id/restore
   * 恢復已軟刪除的產品
   */
  @Post(':id/restore')
  async restoreProduct(@Param('id') id: string) {
    this.logger.info({ productId: id }, '恢復產品請求');
    await this.productsAdminService.restoreProduct(id);
    this.logger.info({ productId: id }, '恢復產品成功');
    return {
      message: '產品已恢復',
    };
  }

  /**
   * PATCH /api/admin/products/:id/toggle-status
   * 切換產品啟用/停用狀態
   */
  @Patch(':id/toggle-status')
  async toggleStatus(@Param('id') id: string): Promise<Product> {
    this.logger.info({ productId: id }, '切換產品狀態請求');
    const product = await this.productsAdminService.toggleStatus(id);
    this.logger.info(
      { productId: id, newStatus: product.isActive },
      '切換產品狀態成功',
    );
    return product;
  }
}
