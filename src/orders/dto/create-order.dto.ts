import { IsString, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto';

/**
 * 建立訂單 DTO
 * 用於管理員建立訂單
 * POST /api/admin/orders
 */
export class CreateOrderDto {
  @IsString({ message: '會員 ID 必須是字串' })
  memberId: string;

  @IsArray({ message: '訂單項目必須是陣列' })
  @ArrayMinSize(1, { message: '訂單至少需要一個項目' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
