/**
 * Order 實體介面
 * 定義訂單在系統中的資料結構
 */
export interface Order {
  /**
   * 訂單唯一識別碼（Firestore Document ID）
   */
  id: string;

  /**
   * 訂單編號（格式：ORD-YYYYMMDD-XXXXX）
   */
  orderNumber: string;

  /**
   * 會員 UID（Firebase Auth UID）
   */
  memberId: string;

  /**
   * 訂單項目列表
   */
  items: OrderItem[];

  /**
   * 訂單總金額
   */
  totalAmount: number;

  /**
   * 訂單狀態
   * - pending: 待處理
   * - processing: 處理中
   * - completed: 已完成
   * - cancelled: 已取消
   */
  status: 'pending' | 'processing' | 'completed' | 'cancelled';

  /**
   * 建立時間戳
   */
  createdAt: Date;

  /**
   * 最後更新時間戳
   */
  updatedAt: Date;
}

/**
 * OrderItem 介面
 * 定義訂單項目的資料結構
 */
export interface OrderItem {
  /**
   * 商品 ID
   */
  productId: string;

  /**
   * 商品名稱
   */
  productName: string;

  /**
   * 購買數量
   */
  quantity: number;

  /**
   * 商品單價
   */
  price: number;
}
