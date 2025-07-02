import type { QueryMediator, Query, QueryHandler, QueryMiddleware, QueryCache } from '@synet/patterns';

export class DefaultQueryMediator implements QueryMediator {
  // Using the same typing pattern as your Mediator
  private handlers = new Map<string, QueryHandler<Query<unknown>, unknown>>();
  private middlewares: QueryMiddleware[] = [];
  private cache?: QueryCache;

  constructor(cache?: QueryCache) {
    this.cache = cache;
  }

  /**
   * Register a handler for a specific query type
   */
  registerHandler<TQuery extends Query<TResult>, TResult>(
    queryId: string,
    handler: QueryHandler<TQuery, TResult>
  ): void {
    if (this.handlers.has(queryId)) {
      throw new Error(`Handler already registered for query: ${queryId}`);
    }

    this.handlers.set(
      queryId,
      handler as QueryHandler<Query<unknown>, unknown>
    );
  }

  registerMiddleware(middleware: QueryMiddleware): void {
    this.middlewares.push(middleware);
  }

   async query<TResult>(query: Query<TResult>): Promise<TResult> {
    const startTime = performance.now();
    
    // Build middleware chain (same pattern as CommandBus)
    let index = 0;
    const executeNext = async (): Promise<TResult> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        // Middleware needs to be updated to work with the new return type
        return middleware.execute(query, executeNext);
      }
      
      // Final step: execute handler
      const handler = this.handlers.get(query.queryId);
      if (!handler) {
        throw new Error(`No handler registered for query: ${query.queryId}`);
      }
      
      // Cast is safe because we maintain the type association when registering
      const typedHandler = handler as QueryHandler<Query<TResult>, TResult>;
      return await Promise.resolve(typedHandler.handle(query));
    };

    return executeNext();
  }

  async invalidateCache(pattern: string): Promise<void> {
    await this.cache?.invalidate(pattern);
  }
}