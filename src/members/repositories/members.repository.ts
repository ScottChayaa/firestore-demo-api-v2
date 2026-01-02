import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Member } from '../entities/member.entity';
import { MemberQueryDto } from '../dto/member-query.dto';
import { PaginationHelper } from '../../common/pagination/pagination.helper';
import { PaginationResult } from '../../common/pagination/pagination.interface';

@Injectable()
export class MembersRepository {
  private readonly collection: admin.firestore.CollectionReference;

  constructor(
    @Inject('FIRESTORE') private readonly firestore: admin.firestore.Firestore,
  ) {
    this.collection = this.firestore.collection('members');
  }

  /**
   * 建立會員記錄
   * 自動設定 createdAt 和 updatedAt
   */
  async create(
    uid: string,
    data: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Member> {
    const now = admin.firestore.Timestamp.now();
    const memberData = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection.doc(uid).set(memberData);

    const doc = await this.collection.doc(uid).get();
    return this.mapToEntity(doc);
  }

  /**
   * 根據 UID 取得會員
   * 預設排除已刪除的會員（deletedAt !== null）
   */
  async findById(
    uid: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Member | null> {
    const doc = await this.collection.doc(uid).get();

    if (!doc.exists) {
      return null;
    }

    const member = this.mapToEntity(doc);

    // 預設排除已刪除的會員
    if (!options?.includeDeleted && member.deletedAt) {
      return null;
    }

    return member;
  }

  /**
   * 根據 Email 查詢會員
   */
  async findByEmail(
    email: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Member | null> {
    let query: admin.firestore.Query = this.collection.where('email', '==', email);

    // 預設排除已刪除的會員
    if (!options?.includeDeleted) {
      query = query.where('deletedAt', '==', null);
    }

    const snapshot = await query.limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    return this.mapToEntity(snapshot.docs[0]);
  }

  /**
   * 查詢會員列表（分頁、篩選、排序）
   */
  async findAll(queryDto: MemberQueryDto): Promise<PaginationResult<Member>> {
    let query: admin.firestore.Query = this.collection;

    // 預設排除已刪除的會員
    if (!queryDto.includeDeleted) {
      query = query.where('deletedAt', '==', null);
    }

    // 搜尋功能（name 或 email）
    // 注意：Firestore 的搜尋功能有限，這裡只做前綴搜尋
    if (queryDto.search) {
      // Firestore 不支持 OR 查詢和 LIKE，這裡使用 name 的前綴搜尋
      // 更好的方案是使用 Algolia 或 Elasticsearch
      query = query
        .where('name', '>=', queryDto.search)
        .where('name', '<=', queryDto.search + '\uf8ff');
    }

    // 排序
    const orderBy = queryDto.orderBy || 'createdAt';
    const order = queryDto.order || 'desc';
    query = query.orderBy(orderBy, order);

    // 分頁（使用 mapToEntity 转换 Firestore Timestamp 为 Date）
    return PaginationHelper.paginate<Member>(
      query,
      {
        cursor: queryDto.cursor,
        limit: queryDto.limit,
      },
      (doc) => this.mapToEntity(doc),
    );
  }

  /**
   * 更新會員資料
   * 自動更新 updatedAt
   */
  async update(
    uid: string,
    data: Partial<Omit<Member, 'id' | 'createdAt'>>,
  ): Promise<Member> {
    const updateData = {
      ...data,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await this.collection.doc(uid).update(updateData);

    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到會員 ID: ${uid}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 檢查 Email 是否已存在（排除已刪除的）
   */
  async emailExists(email: string): Promise<boolean> {
    const member = await this.findByEmail(email, { includeDeleted: false });
    return member !== null;
  }

  /**
   * 軟刪除會員
   * 設定 deletedAt 和 deletedBy
   */
  async softDelete(uid: string, deletedBy: string): Promise<Member> {
    const updateData = {
      deletedAt: admin.firestore.Timestamp.now(),
      deletedBy,
      isActive: false,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await this.collection.doc(uid).update(updateData);

    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到會員 ID: ${uid}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 恢復已軟刪除的會員
   * 清除 deletedAt 和 deletedBy
   */
  async restore(uid: string): Promise<Member> {
    const updateData = {
      deletedAt: null,
      deletedBy: null,
      isActive: true,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await this.collection.doc(uid).update(updateData);

    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到會員 ID: ${uid}`);
    }

    return this.mapToEntity(doc);
  }

  /**
   * 切換會員啟用/停用狀態
   */
  async toggleStatus(uid: string): Promise<Member> {
    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) {
      throw new NotFoundException(`找不到會員 ID: ${uid}`);
    }

    const currentMember = this.mapToEntity(doc);
    const newStatus = !currentMember.isActive;

    const updateData = {
      isActive: newStatus,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await this.collection.doc(uid).update(updateData);

    const updatedDoc = await this.collection.doc(uid).get();
    return this.mapToEntity(updatedDoc);
  }

  /**
   * 私有方法：映射 Firestore Document 到 Member Entity
   */
  private mapToEntity(doc: admin.firestore.DocumentSnapshot): Member {
    const data = doc.data();
    if (!data) {
      throw new NotFoundException('會員資料不存在');
    }

    return {
      id: doc.id,
      email: data.email,
      name: data.name,
      phone: data.phone || null,
      isActive: data.isActive,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      deletedAt: data.deletedAt?.toDate() || null,
      deletedBy: data.deletedBy || null,
    };
  }
}
