import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProductsRepository } from '../products.repository';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { AdminProductQueryDto } from '../dto/admin-product-query.dto';
import { Product } from '../entities/product.entity';
import { PaginationResult } from '../../common/pagination/pagination.interface';
import { StorageService } from '../../storage/storage.service';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Injectable()
export class ProductsAdminService {
  constructor(
    private readonly productsRepo: ProductsRepository,
    private readonly storageService: StorageService,
    @InjectPinoLogger(ProductsAdminService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * 查詢產品列表
   * 支援分頁、篩選、排序、軟刪除包含選項
   */
  async getProducts(
    query: AdminProductQueryDto,
  ): Promise<PaginationResult<Product>> {
    return this.productsRepo.findAll(query);
  }

  /**
   * 建立產品
   */
  async createProduct(dto: CreateProductDto): Promise<Product> {
    // 驗證價格和庫存
    if (dto.price < 0) {
      throw new BadRequestException('價格不能為負數');
    }
    if (dto.stock < 0) {
      throw new BadRequestException('庫存不能為負數');
    }

    let finalImageUrl = dto.imageUrl;

    // 如果有圖片且在暫存區，移動到正式區
    if (dto.imageUrl) {
      const filePath = this.storageService.extractFilePathFromUrl(dto.imageUrl);

      if (filePath.startsWith('temp/')) {
        const permanentFilePath =
          await this.storageService.moveFromTempToPermanent(filePath);
        finalImageUrl = this.storageService.getCdnUrl(permanentFilePath);

        this.logger.info(
          { tempPath: filePath, permanentPath: permanentFilePath },
          '產品圖片已移動到正式區',
        );
      }
    }

    return this.productsRepo.create({
      ...dto,
      imageUrl: finalImageUrl,
    });
  }

  /**
   * 取得單一產品
   */
  async getProduct(
    id: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Product> {
    const product = await this.productsRepo.findById(id, options);
    if (!product) {
      throw new NotFoundException(`找不到產品 ID: ${id}`);
    }
    return product;
  }

  /**
   * 更新產品
   */
  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    // 檢查產品是否存在
    const product = await this.productsRepo.findById(id, {
      includeDeleted: true,
    });

    if (!product) {
      throw new NotFoundException(`找不到產品 ID: ${id}`);
    }

    // 不能更新已刪除的產品
    if (product.deletedAt) {
      throw new BadRequestException('無法更新已刪除的產品');
    }

    // 驗證價格和庫存
    if (dto.price !== undefined && dto.price < 0) {
      throw new BadRequestException('價格不能為負數');
    }
    if (dto.stock !== undefined && dto.stock < 0) {
      throw new BadRequestException('庫存不能為負數');
    }

    return this.productsRepo.update(id, dto);
  }

  /**
   * 軟刪除產品
   */
  async deleteProduct(id: string, adminUid: string): Promise<Product> {
    // 檢查產品是否存在
    const product = await this.productsRepo.findById(id, {
      includeDeleted: true,
    });

    if (!product) {
      throw new NotFoundException(`找不到產品 ID: ${id}`);
    }

    // 檢查是否已經被刪除
    if (product.deletedAt) {
      throw new BadRequestException('產品已經被刪除');
    }

    return this.productsRepo.softDelete(id, adminUid);
  }

  /**
   * 恢復已刪除產品
   */
  async restoreProduct(id: string): Promise<Product> {
    // 檢查產品是否存在
    const product = await this.productsRepo.findById(id, {
      includeDeleted: true,
    });

    if (!product) {
      throw new NotFoundException(`找不到產品 ID: ${id}`);
    }

    // 檢查是否已被刪除
    if (!product.deletedAt) {
      throw new BadRequestException('產品未被刪除，無需恢復');
    }

    return this.productsRepo.restore(id);
  }

  /**
   * 切換產品啟用/停用狀態
   */
  async toggleStatus(id: string): Promise<Product> {
    // 檢查產品是否存在
    const product = await this.productsRepo.findById(id, {
      includeDeleted: true,
    });

    if (!product) {
      throw new NotFoundException(`找不到產品 ID: ${id}`);
    }

    // 不能切換已刪除產品的狀態
    if (product.deletedAt) {
      throw new BadRequestException('無法切換已刪除產品的狀態');
    }

    return this.productsRepo.toggleStatus(id);
  }

  /**
   * 取得所有分類
   */
  async getCategories(options?: { includeDeleted?: boolean }): Promise<string[]> {
    return this.productsRepo.getCategories(options);
  }
}
