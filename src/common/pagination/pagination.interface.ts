export interface PaginationResult<T> {
  data: T[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
    count: number;
  };
}

export interface PaginationQuery {
  cursor?: string;
  limit?: number;
  order?: 'asc' | 'desc';
}
