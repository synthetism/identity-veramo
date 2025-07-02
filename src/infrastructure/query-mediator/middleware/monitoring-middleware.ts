import type { Logger } from '@synet/logger';
import type { Query, QueryResult, QueryMiddleware, QueryCache } from '@synet/patterns';

/**
 * Performance monitoring middleware
 */
export function createMonitoringMiddleware(logger?: Logger): QueryMiddleware {
  return {
    async execute<TResult>(
      query: Query<TResult>,
      next: () => Promise<TResult>
    ): Promise<TResult> {
      const startTime = performance.now();
      logger?.debug(`Executing query: ${query.queryId}`);
      
      try {
        const result = await next();
        const duration = Math.round(performance.now() - startTime);
        
        logger?.info(`Query completed: ${query.queryId}`, {
          duration,    
        });
        
        return result;
      } catch (error) {
        const duration = Math.round(performance.now() - startTime);
        logger?.error(`Query failed: ${query.queryId}`, { duration, error });
        throw error;
      }
    }
  };
}
