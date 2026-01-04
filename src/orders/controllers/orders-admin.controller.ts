import {
  Controller,
  Get,
  Post,
  Put,
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
import { OrdersService } from '../services/orders.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrderQueryDto } from '../dto/order-query.dto';
import { Order } from '../entities/order.entity';
import { PaginationResult } from '../../common/pagination/pagination.interface';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Controller('admin/orders')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('admin')
export class OrdersAdminController {
  constructor(
    private readonly ordersService: OrdersService,
    @InjectPinoLogger(OrdersAdminController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * GET /api/admin/orders
   * 查詢所有訂單列表（分頁、篩選、排序）
   */
  @Get()
  async getOrders(@Query() query: OrderQueryDto): Promise<PaginationResult<Order>> {
    this.logger.info({ query }, '查詢訂單列表請求');
    const result = await this.ordersService.getOrders(query);
    this.logger.info({ count: result.data.length }, '查詢訂單列表成功');
    return result;
  }

  /**
   * GET /api/admin/orders/:id
   * 取得單一訂單詳情
   */
  @Get(':id')
  async getOrder(@Param('id') id: string): Promise<Order> {
    this.logger.info({ orderId: id }, '取得單一訂單請求');
    const order = await this.ordersService.getOrder(id);
    this.logger.info({ orderId: id }, '取得單一訂單成功');
    return order;
  }

  /**
   * POST /api/admin/orders
   * 建立訂單
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() dto: CreateOrderDto) {
    this.logger.info({ memberId: dto.memberId, itemsCount: dto.items.length }, '建立訂單請求');
    const order = await this.ordersService.createOrder(dto);
    this.logger.info({ orderId: order.id, orderNumber: order.orderNumber }, '建立訂單成功');
    return {
      message: '訂單建立成功',
      order,
    };
  }

  /**
   * PUT /api/admin/orders/:id
   * 更新訂單（主要用於更新狀態）
   */
  @Put(':id')
  async updateOrder(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ): Promise<Order> {
    this.logger.info({ orderId: id, updateData: dto }, '更新訂單請求');
    const order = await this.ordersService.updateOrder(id, dto);
    this.logger.info({ orderId: id, newStatus: order.status }, '更新訂單成功');
    return order;
  }

  /**
   * DELETE /api/admin/orders/:id
   * 刪除訂單
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteOrder(@Param('id') id: string) {
    this.logger.warn({ orderId: id }, '刪除訂單請求');
    await this.ordersService.deleteOrder(id);
    this.logger.warn({ orderId: id }, '刪除訂單成功');
    return {
      message: '訂單已刪除',
    };
  }
}
