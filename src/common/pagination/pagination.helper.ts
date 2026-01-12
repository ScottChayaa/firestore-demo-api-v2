import {
  PaginationResult,
  PaginationQuery,
} from './pagination.interface';
import * as admin from 'firebase-admin';

export class PaginationHelper {
  static async paginate<T>(
    query: admin.firestore.Query,
    collectionName: string,
    options: PaginationQuery,
    mapper?: (doc: admin.firestore.DocumentSnapshot) => T,
  ): Promise<PaginationResult<T>> {
    const { cursor, limit = 20 } = options;

    // 查詢 limit + 1 筆，用於判斷是否還有更多資料
    let paginatedQuery = query.limit(limit + 1);

    // 如果有 cursor，從該位置開始查詢
    if (cursor) {
      const cursorDoc = await query.firestore
        .collection(collectionName)
        .doc(cursor)
        .get();
      if (cursorDoc.exists) {
        paginatedQuery = paginatedQuery.startAfter(cursorDoc);
      }
    }

    const snapshot = await paginatedQuery.get();
    const docs = snapshot.docs;
    const hasMore = docs.length > limit;

    // 如果有更多資料，移除最後一筆（用於判斷 hasMore）
    if (hasMore) {
      docs.pop();
    }

    const data = mapper
      ? docs.map(mapper)
      : docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];

    return {
      data,
      pagination: {
        limit,
        hasMore,
        nextCursor: hasMore && docs.length > 0 ? docs[docs.length - 1].id : undefined,
        count: docs.length,
      },
    };
  }
}
