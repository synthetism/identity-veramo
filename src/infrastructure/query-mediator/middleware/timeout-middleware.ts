import type { Query, QueryResult, QueryMiddleware } from '@synet/patterns';

/**
 * Query timeout middleware
 */
export function createTimeoutMiddleware(defaultTimeout = 30000): QueryMiddleware {
  return {
    async execute<TResult>(
      query: Query<TResult>,
      next: () => Promise<TResult>
    ): Promise<TResult> {
      const timeout = query.timeout || defaultTimeout;
      
      return Promise.race([
        next(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Query timeout: ${query.queryId}`)), timeout)
        )
      ]);
    }
  };
}