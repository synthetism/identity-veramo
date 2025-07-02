import type { Logger } from '@synet/logger';
import type { Query, QueryResult, QueryMiddleware, QueryCache } from '@synet/patterns';

/**
 * Field projection middleware (for database optimization)

export function createProjectionMiddleware(): QueryMiddleware {
  return {
    async execute<TResult>(
      query: Query<TResult>,
      next: () => Promise<QueryResult<TResult>>
    ): Promise<QueryResult<TResult>> {
      const result = await next();
      
      // If projection specified, filter the result
      if (query.projection && query.projection.length > 0) {
        const projected = this.projectFields(result.data, query.projection);
        result.data = projected;
        result.metadata.projectedFields = query.projection;
      }
      
      return result;
    },
    
    projectFields<T>(data: T, fields: string[]): T {
      if (!data || typeof data !== 'object') return data;
      
      if (Array.isArray(data)) {
        return data.map(item => this.projectFields(item, fields)) as T;
      }
      
      const projected = {} as T;
      for (const field of fields) {
        if (field in data) {
          (projected as any)[field] = (data as any)[field];
        }
      }
      
      return projected;
    }
  };
} */