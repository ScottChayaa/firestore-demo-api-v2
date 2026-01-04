import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrdersService } from '../services/orders.service';
import { OrderQueryDto } from '../dto/order-query.dto';
import { Order } from '../entities/order.entity';
import { PaginationResult } from '../../common/pagination/pagination.interface';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as admin from 'firebase-admin';

@Controller('member/orders')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('member')
export class MemberOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    @InjectPinoLogger(MemberOrdersController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * GET /api/member/orders
   * 取得自己的訂單列表（分頁、篩選、排序）
   * 強制只能查詢自己的訂單
   */
  @Get()
  async getMyOrders(
    @CurrentUser() user: admin.auth.DecodedIdToken,
    @Query() query: OrderQueryDto,
  ): Promise<PaginationResult<Order>> {
    // 強制設定 memberId 為當前用戶的 UID
    query.memberId = user.uid;

    this.logger.info({ memberId: user.uid, query }, '會員查詢自己的訂單請求');
    const result = await this.ordersService.getOrders(query);
    this.logger.info({ memberId: user.uid, count: result.data.length }, '會員查詢訂單成功');
    return result;
  }
}
