import type { Logger } from '@synet/logger';
import type { Query, QueryResult, QueryMiddleware, QueryCache } from '@synet/patterns';

/**
 * Caching middleware for queries
 */
export function createCachingMiddleware(cache: QueryCache, logger?: Logger): QueryMiddleware {
  return {
    async execute<TResult>(
      query: Query<TResult>,
      next: () => Promise<TResult>
    ): Promise<TResult> {
      const cacheKey = query.cacheKey || `query:${query.queryId}:${JSON.stringify(query)}`;
      
      // Try cache first
      const cached = await cache.get<TResult>(cacheKey);
      if (cached) {
        logger?.debug(`Query cache hit: ${query.queryId}`);
        return cached;
      }
      
      // Execute query
      const result = await next();
      
      // Cache result if TTL specified
      if (query.cacheTtl && query.cacheTtl > 0) {
        await cache.set(cacheKey, result, query.cacheTtl);
      }

      return result;
    }
  };
}