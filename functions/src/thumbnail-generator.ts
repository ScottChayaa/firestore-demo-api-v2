/**
 * 縮圖生成器
 * 使用 Sharp 處理圖片並上傳到 GCS
 */

import * as sharp from 'sharp';
import { Storage } from '@google-cloud/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { ThumbnailConfig } from './config';
import { ThumbnailInfo, Thumbnails, ThumbnailStatus } from './types';

const storage = new Storage();

/**
 * 生成單個縮圖
 */
export async function generateThumbnail(
  bucketName: string,
  sourceFilePath: string,
  config: ThumbnailConfig
): Promise<ThumbnailInfo> {
  // 1. 下載原圖
  const bucket = storage.bucket(bucketName);
  const sourceFile = bucket.file(sourceFilePath);

  const [buffer] = await sourceFile.download();
  console.log(
    `Downloaded ${sourceFilePath}, size: ${buffer.length} bytes`
  );

  // 2. 生成縮圖路徑
  // 原始: uploads/image/2026/01/uuid-filename.jpg
  // 縮圖: thumbs/small/image/2026/01/uuid-filename.jpg (或 .webp)
  const thumbnailPath = sourceFilePath.replace(
    'uploads/',
    `thumbs/${config.size}/`
  );

  // 如果輸出格式為 WebP，修改副檔名
  const finalPath =
    config.format === 'webp'
      ? thumbnailPath.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp')
      : thumbnailPath;

  // 3. 使用 Sharp 生成縮圖
  let sharpInstance = sharp(buffer);

  // 獲取原圖尺寸
  const metadata = await sharpInstance.metadata();
  console.log(`Original image: ${metadata.width}x${metadata.height}`);

  // 計算縮圖尺寸（保持比例）
  sharpInstance = sharpInstance.resize(config.maxWidth, config.maxHeight, {
    fit: 'inside', // 保持比例，不裁切
    withoutEnlargement: true, // 不放大小圖
  });

  // 設定輸出格式
  if (config.format === 'webp') {
    sharpInstance = sharpInstance.webp({ quality: config.quality });
  } else {
    sharpInstance = sharpInstance.jpeg({ quality: config.quality });
  }

  const thumbnailBuffer = await sharpInstance.toBuffer();
  const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();

  console.log(
    `Generated ${config.size} thumbnail: ${thumbnailMetadata.width}x${thumbnailMetadata.height}, ` +
      `size: ${thumbnailBuffer.length} bytes, format: ${config.format}`
  );

  // 4. 上傳縮圖到 GCS
  const thumbnailFile = bucket.file(finalPath);
  await thumbnailFile.save(thumbnailBuffer, {
    metadata: {
      contentType: config.format === 'webp' ? 'image/webp' : 'image/jpeg',
      metadata: {
        originalFile: sourceFilePath,
        thumbnailSize: config.size,
      },
    },
  });

  console.log(`Uploaded thumbnail to ${finalPath}`);

  // 5. 生成 CDN URL
  const cdnUrl = `https://storage.googleapis.com/${bucketName}/${finalPath}`;

  return {
    filePath: finalPath,
    url: cdnUrl,
    width: thumbnailMetadata.width || 0,
    height: thumbnailMetadata.height || 0,
    fileSize: thumbnailBuffer.length,
    format: config.format,
  };
}

/**
 * 更新 Firestore 檔案文檔
 */
export async function updateFileDocument(
  fileId: string,
  thumbnails: Thumbnails,
  status: ThumbnailStatus,
  error?: string
): Promise<void> {
  const db = getFirestore();

  const updateData: any = {
    thumbnails,
    thumbnailStatus: status,
    thumbnailGeneratedAt: new Date(),
  };

  if (error) {
    updateData.thumbnailError = error;
  }

  await db.collection('files').doc(fileId).update(updateData);
  console.log(`Updated file document ${fileId} with thumbnail info`);
}

/**
 * 從檔案路徑查找 Firestore 文檔
 */
export async function findFileByPath(
  filePath: string
): Promise<string | null> {
  const db = getFirestore();

  const snapshot = await db
    .collection('files')
    .where('filePath', '==', filePath)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.warn(`No file document found for path: ${filePath}`);
    return null;
  }

  return snapshot.docs[0].id;
}
