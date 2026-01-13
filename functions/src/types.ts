/**
 * TypeScript 類型定義
 */

export interface ThumbnailInfo {
  url: string; // CDN URL
  filePath: string; // GCS 路徑
  width: number;
  height: number;
  fileSize: number;
  format: 'jpeg' | 'png' | 'webp';
}

export interface Thumbnails {
  small?: ThumbnailInfo;
  medium?: ThumbnailInfo;
  large?: ThumbnailInfo;
  custom?: ThumbnailInfo;
}

export type ThumbnailStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';
