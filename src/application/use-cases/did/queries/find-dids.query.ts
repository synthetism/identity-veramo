import { Result } from "@synet/patterns";
import type { IIdentifier } from "@synet/identity-core";
import type { DidDependencies } from "../types";


export const findDidsQuery = (deps: DidDependencies) => {
  return async (): Promise<Result<IIdentifier[]>> => {
    try {
      deps.logger?.debug("Finding all DIDs");
      
      const result = await deps.didService.find({});
      
      if (!result.isSuccess) {
        deps.logger?.error(`Failed to list DIDs: ${result.errorMessage}`);
        return Result.fail(
          `Failed to list DIDs: ${result.errorMessage}`,
          result.errorCause
        );
      }

      return Result.success(result.value || []);
    } catch (error) {
      const errorMessage = `Unexpected error finding DIDs: ${error instanceof Error ? error.message : 'Unknown error'}`;
      deps.logger?.error(errorMessage, error);
      return Result.fail(errorMessage, error instanceof Error ? error : undefined);
    }
  };
};
