export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;

  /**
   * 啟用狀態
   * true: 已啟用（前台可見）
   * false: 已停用（前台不可見）
   */
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;

  /**
   * 軟刪除時間戳
   * null: 未刪除
   * Date: 刪除時間
   */
  deletedAt?: Date | null;

  /**
   * 刪除者的 UID
   */
  deletedBy?: string | null;
}
