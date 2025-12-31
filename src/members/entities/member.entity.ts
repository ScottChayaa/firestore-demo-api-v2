/**
 * Member 實體介面
 * 定義會員在系統中的資料結構
 */
export interface Member {
  /**
   * 會員唯一識別碼（Firebase Auth UID）
   * 同時作為 Firestore Document ID
   */
  id: string;

  /**
   * 電子郵件（來自 Firebase Auth）
   */
  email: string;

  /**
   * 會員姓名
   */
  name: string;

  /**
   * 電話號碼（可選）
   */
  phone?: string;

  /**
   * 啟用狀態
   * - true: 已啟用（可登入）
   * - false: 已停用（無法登入）
   */
  isActive: boolean;

  /**
   * 建立時間戳
   */
  createdAt: Date;

  /**
   * 最後更新時間戳
   */
  updatedAt: Date;

  /**
   * 軟刪除時間戳
   * - null: 未刪除
   * - Date: 刪除時間
   */
  deletedAt?: Date | null;

  /**
   * 刪除者的 UID
   * 用於追蹤是誰執行了刪除操作
   */
  deletedBy?: string | null;
}
