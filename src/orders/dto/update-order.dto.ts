import { IsOptional, IsEnum } from 'class-validator';

/**
 * 更新訂單 DTO
 * 用於更新訂單狀態
 * PUT /api/admin/orders/:id
 */
export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'cancelled'], {
    message: '狀態必須是 pending, processing, completed 或 cancelled',
  })
  status?: 'pending' | 'processing' | 'completed' | 'cancelled';
}
