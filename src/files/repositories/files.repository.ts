import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { File } from '../entities/file.entity';
import { FileQueryDto } from '../dto/file-query.dto';
import { AdminFileQueryDto } from '../dto/admin-file-query.dto';
import { PaginationHelper } from '../../common/pagination/pagination.helper';
import { PaginationResult } from '../../common/pagination/pagination.interface';
import { FIRESTORE } from '../../firebase/firebase.constants';

@Injectable()
export class FilesRepository {
  constructor(
    @Inject(FIRESTORE) private firestore: admin.firestore.Firestore,
  ) {}

  /**
   * 取得檔案列表（支援分頁和篩選）
   * 支援前台和後台查詢
   */
  async findAll(
    queryDto: FileQueryDto | AdminFileQueryDto,
  ): Promise<PaginationResult<File>> {
    let firestoreQuery: admin.firestore.Query =
      this.firestore.collection('files');

    // 檢查是否為管理端查詢
    const isAdminQuery =
      'includeDeleted' in queryDto || 'status' in queryDto;

    // 前台查詢自動排除已刪除和暫存的檔案
    if (!isAdminQuery) {
      firestoreQuery = firestoreQuery.where('deletedAt', '==', null);
      firestoreQuery = firestoreQuery.where('status', '==', 'uploaded');
    } else {
      // 管理端查詢：根據參數決定
      const adminQuery = queryDto as AdminFileQueryDto;

      // 預設排除已刪除的檔案
      if (!adminQuery.includeDeleted) {
        firestoreQuery = firestoreQuery.where('deletedAt', '==', null);
      }

      // 狀態篩選（僅管理端）
      if (adminQuery.status) {
        firestoreQuery = firestoreQuery.where(
          'status',
          '==',
          adminQuery.status,
        );
      }

      // 檔案大小篩選（僅管理端）
      if (adminQuery.minFileSize !== undefined) {
        firestoreQuery = firestoreQuery.where(
          'fileSize',
          '>=',
          adminQuery.minFileSize,
        );
      }
      if (adminQuery.maxFileSize !== undefined) {
        firestoreQuery = firestoreQuery.where(
          'fileSize',
          '<=',
          adminQuery.maxFileSize,
        );
      }

      // 檔案類型篩選（僅管理端）
      if (adminQuery.contentType) {
        firestoreQuery = firestoreQuery.where(
          'contentType',
          '==',
          adminQuery.contentType,
        );
      }

      // 上傳者篩選（僅管理端）
      if (adminQuery.uploadedBy) {
        firestoreQuery = firestoreQuery.where(
          'uploadedBy',
          '==',
          adminQuery.uploadedBy,
        );
      }
    }

    // 分類篩選（前台和後台共用）
    if (queryDto.category) {
      firestoreQuery = firestoreQuery.where(
        'category',
        '==',
        queryDto.category,
      );
    }

    // 排序欄位（預設 createdAt）
    const orderBy = queryDto.orderBy || 'createdAt';
    const order = queryDto.order || 'desc';
    firestoreQuery = firestoreQuery.orderBy(orderBy, order);

    // 執行分頁查詢
    return PaginationHelper.paginate<File>(
      firestoreQuery,
      'files',
      {
        cursor: queryDto.cursor,
        limit: queryDto.limit,
      },
      (doc) => this.mapToEntity(doc),
    );
  }

  /**
   * 根據 ID 取得單一檔案
   */
  async findById(
    id: string,
    options?: { includeDeleted?: boolean },
  ): Promise<File> {
    const doc = await this.firestore.collection('files').doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`找不到檔案 ID: ${id}`);
    }

    const file = this.mapToEntity(doc);

    // 前台預設排除已刪除和暫存的檔案
    if (!options?.includeDeleted) {
      if (file.deletedAt || file.status === 'temp') {
        throw new NotFoundException(`找不到檔案 ID: ${id}`);
      }
    }

    return file;
  }

  /**
   * 取得所有檔案分類列表
   */
  async getCategories(
    options?: { includeDeleted?: boolean },
  ): Promise<string[]> {
    let query: admin.firestore.Query = this.firestore.collection('files');

    // 預設排除已刪除的檔案
    if (!options?.includeDeleted) {
      query = query.where('deletedAt', '==', null);
    }

    const snapshot = await query.select('category').get();

    // 使用 Set 去重
    const categories = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const category = doc.data().category;
      if (category) {
        categories.add(category);
      }
    });

    return Array.from(categories).sort();
  }

  /**
   * 建立檔案記錄
   */
  async create(
    data: Omit<
      File,
      | 'id'
      | 'status'
      | 'createdAt'
      | 'updatedAt'
      | 'deletedAt'
      | 'deletedBy'
      | 'filePath'
      | 'uploadedBy'
    >,
    uploadedBy: string,
  ): Promise<File> {
    const docRef = this.firestore.collection('files').doc();

    const now = admin.firestore.Timestamp.now();
    const fileData = {
      ...data,
      filePath: '', // 暫時為空，確認上傳後更新
      uploadedBy,
      status: 'temp', // 初始狀態為暫存
      deletedAt: null,
      deletedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(fileData);

    const doc = await docRef.get();
    return this.mapToEntity(doc);
  }

  /**
   * 更新檔案元數據
   */
  async update(
    id: string,
    data: Partial<Omit<File, 'id' | 'createdAt'>>,
  ): Promise<File> {
    const docRef = this.firestore.collection('files').doc(id);

    const updateData = {
      ...data,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await docRef.update(updateData);

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到檔案 ID: ${id}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 確認上傳（將 temp/ 移到 uploads/，更新狀態）
   */
  async confirmUpload(id: string, permanentFilePath: string): Promise<File> {
    const docRef = this.firestore.collection('files').doc(id);

    await docRef.update({
      filePath: permanentFilePath,
      status: 'uploaded',
      tempFilePath: null, // 清除暫存路徑
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到檔案 ID: ${id}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 軟刪除檔案
   */
  async softDelete(id: string, deletedBy: string): Promise<File> {
    const docRef = this.firestore.collection('files').doc(id);

    await docRef.update({
      deletedAt: admin.firestore.Timestamp.now(),
      deletedBy: deletedBy,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到檔案 ID: ${id}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 恢復已刪除檔案
   */
  async restore(id: string): Promise<File> {
    const docRef = this.firestore.collection('files').doc(id);

    await docRef.update({
      deletedAt: null,
      deletedBy: null,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到檔案 ID: ${id}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 將 Firestore Document 映射到 File Entity
   */
  private mapToEntity(doc: admin.firestore.DocumentSnapshot): File {
    const data = doc.data();
    return {
      id: doc.id,
      fileName: data.fileName,
      originalFileName: data.originalFileName,
      filePath: data.filePath,
      tempFilePath: data.tempFilePath || undefined,
      cdnUrl: data.cdnUrl,
      contentType: data.contentType,
      fileSize: data.fileSize,
      category: data.category,
      uploadedBy: data.uploadedBy,
      description: data.description || undefined,
      tags: data.tags || undefined,
      status: data.status,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      deletedAt: data.deletedAt?.toDate() || null,
      deletedBy: data.deletedBy || null,
    };
  }
}
