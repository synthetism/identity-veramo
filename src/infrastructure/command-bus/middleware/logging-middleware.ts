import type { Command, CommandMiddleware } from '@synet/patterns';
import type { Logger } from '@synet/logger';
/**
 * Built-in middleware for logging command execution
 */
export function createLoggingMiddleware(logger?: Logger): CommandMiddleware {
    return async <TResult>(
        command: Command<TResult>,
        next: () => Promise<TResult>,
    ): Promise<TResult> => {
        logger?.debug(`Executing command: ${command.type}`);
        const startTime = performance.now();
        
        try {
            const result = await next();
            const duration = Math.round(performance.now() - startTime);
            logger?.debug(`Command ${command.type} completed in ${duration}ms`);
            return result;
        } catch (error) {
            logger?.error(`Command ${command.type} failed:`, error);
            throw error;
        }
    };
}