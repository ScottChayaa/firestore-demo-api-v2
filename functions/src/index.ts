/**
 * Cloud Function: 自動生成圖片縮圖
 *
 * 當檔案上傳到 GCS 時，自動觸發縮圖生成
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import {
  getThumbnailConfigs,
  isImageFile,
  shouldProcessFile,
} from './config';
import {
  generateThumbnail,
  updateFileDocument,
  findFileByPath,
} from './thumbnail-generator';
import { Thumbnails } from './types';

// 初始化 Firebase Admin
admin.initializeApp();

/**
 * Cloud Function: 自動生成圖片縮圖
 *
 * 觸發時機: 檔案上傳到 GCS 的 finalize 事件
 * 觸發條件:
 *   - 檔案路徑為 uploads/**
 *   - 檔案類型為圖片 (image/*)
 *   - 非縮圖檔案 (不包含 /thumbs/)
 */
export const generateImageThumbnails = functions.storage.onObjectFinalized(
  {
    bucket: process.env.GCS_BUCKET_NAME,
    region: process.env.FUNCTION_REGION || 'asia-east1',
    memory: '512MiB',
    timeoutSeconds: 120,
    maxInstances: 10,
  },
  async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const bucketName = event.bucket;

    console.log(`Processing file: ${filePath}, contentType: ${contentType}`);

    // 1. 檢查是否應該處理
    if (!shouldProcessFile(filePath)) {
      console.log(
        `Skipping file (not in uploads/ or already a thumbnail): ${filePath}`
      );
      return;
    }

    // 2. 檢查是否為圖片
    if (!isImageFile(contentType, filePath)) {
      console.log(`Skipping non-image file: ${filePath}`);
      return;
    }

    // 3. 查找對應的 Firestore 文檔
    const fileId = await findFileByPath(filePath);
    if (!fileId) {
      console.warn(`File document not found in Firestore: ${filePath}`);
      return;
    }

    try {
      // 4. 獲取縮圖配置
      const configs = getThumbnailConfigs().filter((c) => c.enabled);
      console.log(`Generating ${configs.length} thumbnails for ${filePath}`);

      // 5. 生成所有啟用的縮圖
      const thumbnails: Thumbnails = {};

      for (const config of configs) {
        try {
          const result = await generateThumbnail(
            bucketName,
            filePath,
            config
          );
          thumbnails[config.size as keyof Thumbnails] = result;
          console.log(`✅ Generated ${config.size} thumbnail successfully`);
        } catch (error: any) {
          console.error(
            `❌ Failed to generate ${config.size} thumbnail:`,
            error
          );
          // 繼續處理其他尺寸，不因單一失敗而終止
        }
      }

      // 6. 更新 Firestore 文檔
      if (Object.keys(thumbnails).length > 0) {
        await updateFileDocument(fileId, thumbnails, 'completed');
        console.log(
          `✅ All thumbnails generated successfully for ${filePath}`
        );
      } else {
        await updateFileDocument(
          fileId,
          {},
          'failed',
          'No thumbnails generated'
        );
        console.error(`❌ No thumbnails were generated for ${filePath}`);
      }
    } catch (error: any) {
      console.error(`❌ Error processing thumbnails for ${filePath}:`, error);
      await updateFileDocument(fileId, {}, 'failed', error.message);
    }
  }
);
