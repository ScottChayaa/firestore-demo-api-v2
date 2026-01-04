import { IsString, IsInt, IsNumber, Min } from 'class-validator';

/**
 * 訂單項目 DTO
 * 用於建立訂單時的項目資料
 */
export class OrderItemDto {
  @IsString({ message: '商品 ID 必須是字串' })
  productId: string;

  @IsString({ message: '商品名稱必須是字串' })
  productName: string;

  @IsInt({ message: '數量必須是整數' })
  @Min(1, { message: '數量至少為 1' })
  quantity: number;

  @IsNumber({}, { message: '價格必須是數字' })
  @Min(0, { message: '價格不能為負數' })
  price: number;
}
