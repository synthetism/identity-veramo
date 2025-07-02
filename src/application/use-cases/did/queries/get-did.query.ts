import { Result } from "@synet/patterns";
import type { IIdentifier } from "@synet/identity-core";
import type { DidDependencies } from "../types";


export const getDidQuery = (deps: DidDependencies) => {
  return async (did: string): Promise<Result<IIdentifier | null>> => {
    try {
      deps.logger?.debug(`Getting DID: ${did}`);
      
      const result = await deps.didService.get(did);
      
      if (!result.isSuccess) {
        deps.logger?.error(`Failed to get DID: ${result.errorMessage}`);
        return Result.fail(
          `Failed to get DID: ${result.errorMessage}`,
          result.errorCause
        );
      }

      return Result.success(result.value);
    } catch (error) {
      const errorMessage = `Unexpected error getting DID: ${error instanceof Error ? error.message : 'Unknown error'}`;
      deps.logger?.error(errorMessage, error);
      return Result.fail(errorMessage, error instanceof Error ? error : undefined);
    }
  };
};
