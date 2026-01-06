import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { ProductsAdminController } from './controllers/products-admin.controller';
import { ProductsAdminService } from './services/products-admin.service';

@Module({
  controllers: [ProductsController, ProductsAdminController],
  providers: [ProductsService, ProductsAdminService, ProductsRepository],
  exports: [ProductsService],
})
export class ProductsModule {}
