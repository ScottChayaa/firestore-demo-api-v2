/**
 * 縮圖配置管理
 * 從環境變數讀取縮圖生成的相關設定
 */

export interface ThumbnailConfig {
  size: string; // 'small' | 'medium' | 'large' | 'custom'
  maxWidth: number;
  maxHeight: number;
  enabled: boolean;
  format: 'jpeg' | 'webp'; // 輸出格式
  quality: number; // 1-100
}

/**
 * 取得所有縮圖配置
 */
export function getThumbnailConfigs(): ThumbnailConfig[] {
  const configs: ThumbnailConfig[] = [
    {
      size: 'small',
      maxWidth: parseInt(process.env.THUMB_SMALL_WIDTH || '150'),
      maxHeight: parseInt(process.env.THUMB_SMALL_HEIGHT || '150'),
      enabled: process.env.THUMB_SMALL_ENABLED !== 'false',
      format: (process.env.THUMB_SMALL_FORMAT as 'jpeg' | 'webp') || 'jpeg',
      quality: parseInt(process.env.THUMB_SMALL_QUALITY || '80'),
    },
    {
      size: 'medium',
      maxWidth: parseInt(process.env.THUMB_MEDIUM_WIDTH || '400'),
      maxHeight: parseInt(process.env.THUMB_MEDIUM_HEIGHT || '400'),
      enabled: process.env.THUMB_MEDIUM_ENABLED !== 'false',
      format: (process.env.THUMB_MEDIUM_FORMAT as 'jpeg' | 'webp') || 'webp',
      quality: parseInt(process.env.THUMB_MEDIUM_QUALITY || '85'),
    },
    {
      size: 'large',
      maxWidth: parseInt(process.env.THUMB_LARGE_WIDTH || '800'),
      maxHeight: parseInt(process.env.THUMB_LARGE_HEIGHT || '800'),
      enabled: process.env.THUMB_LARGE_ENABLED !== 'false',
      format: (process.env.THUMB_LARGE_FORMAT as 'jpeg' | 'webp') || 'webp',
      quality: parseInt(process.env.THUMB_LARGE_QUALITY || '90'),
    },
  ];

  // 自訂尺寸（可選）
  if (process.env.THUMB_CUSTOM_ENABLED === 'true') {
    configs.push({
      size: 'custom',
      maxWidth: parseInt(process.env.THUMB_CUSTOM_WIDTH || '600'),
      maxHeight: parseInt(process.env.THUMB_CUSTOM_HEIGHT || '600'),
      enabled: true,
      format: (process.env.THUMB_CUSTOM_FORMAT as 'jpeg' | 'webp') || 'webp',
      quality: parseInt(process.env.THUMB_CUSTOM_QUALITY || '85'),
    });
  }

  return configs;
}

/**
 * 檢查是否為圖片檔案
 */
export function isImageFile(
  contentType?: string,
  filePath?: string
): boolean {
  if (!contentType && !filePath) return false;

  const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  if (contentType && imageTypes.includes(contentType)) return true;
  if (filePath) {
    const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    return imageExtensions.includes(ext);
  }

  return false;
}

/**
 * 檢查是否應該處理（只處理 uploads/ 路徑）
 */
export function shouldProcessFile(filePath: string): boolean {
  return (
    filePath.startsWith('uploads/') &&
    !filePath.includes('/thumbs/') &&
    !filePath.startsWith('temp/')
  );
}
