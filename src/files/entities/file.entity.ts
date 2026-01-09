export interface File {
  id: string; // Firestore 文件 ID

  // 檔案資訊
  fileName: string; // 清理後的檔案名稱（UUID-檔名）
  originalFileName: string; // 用戶上傳的原始檔案名稱
  filePath: string; // GCS 正式路徑（uploads/...）
  tempFilePath?: string; // GCS 暫存路徑（temp/...），確認上傳後可清除
  cdnUrl: string; // 公開 CDN URL
  contentType: string; // MIME 類型
  fileSize: number; // 檔案大小（bytes）
  category: string; // 分類（image/document/video/other）

  // 元數據
  uploadedBy: string; // 上傳者 UID
  description?: string; // 檔案描述
  tags?: string[]; // 標籤

  // 狀態
  status: 'temp' | 'uploaded'; // 暫存 | 已上傳

  // 時間戳
  createdAt: Date;
  updatedAt: Date;

  // 軟刪除
  deletedAt?: Date | null;
  deletedBy?: string | null;
}
