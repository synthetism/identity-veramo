import { Result } from "@synet/patterns";
import type { IKey } from "@synet/identity-core";
import type { KeyDependencies } from "../types";


export const getKeyQuery = (deps: KeyDependencies) => {
  return async (keyId: string): Promise<Result<IKey | null>> => {
    try {
      deps.logger?.debug(`Getting key: ${keyId}`);
      
      const result = await deps.keyService.get(keyId);
      
      if (!result.isSuccess) {
        deps.logger?.error(`Failed to get key: ${result.errorMessage}`);
        return Result.fail(
          `Failed to get key: ${result.errorMessage}`,
          result.errorCause
        );
      }

      return Result.success(result.value);
    } catch (error) {
      const errorMessage = `Unexpected error getting key: ${error instanceof Error ? error.message : 'Unknown error'}`;
      deps.logger?.error(errorMessage, error);
      return Result.fail(errorMessage, error instanceof Error ? error : undefined);
    }
  };
};
