import {
  ThumbnailInfo,
  Thumbnails,
  ThumbnailStatus,
} from '../entities/file.entity';

/**
 * 檔案查詢回應 DTO
 * 包含完整的檔案資訊與縮圖資訊
 */
export class FileResponseDto {
  id: string;

  // 檔案資訊
  fileName: string;
  originalFileName: string;
  filePath: string;
  tempFilePath?: string;
  cdnUrl: string;
  contentType: string;
  fileSize: number;
  category: string;

  // 元數據
  uploadedBy: string;
  description?: string;
  tags?: string[];

  // 狀態
  status: 'temp' | 'uploaded';

  // 縮圖資訊
  thumbnails?: Thumbnails;
  thumbnailStatus?: ThumbnailStatus;
  thumbnailError?: string;
  thumbnailGeneratedAt?: Date;

  // 時間戳
  createdAt: Date;
  updatedAt: Date;

  // 軟刪除
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

// 重新匯出類型以便其他模組使用
export { ThumbnailInfo, Thumbnails, ThumbnailStatus };
