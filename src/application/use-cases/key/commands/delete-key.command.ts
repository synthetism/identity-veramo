import { Result } from "@synet/patterns";
import type { UseCase } from "../../../../domain/use-case";
import type { KeyDependencies } from "../types";


export interface DeleteKeyParams {
  keyId: string;
}

export function deleteKeyCommand(deps: KeyDependencies): 
  UseCase<DeleteKeyParams, Promise<Result<boolean>>> {

  return {
    execute: async (params: DeleteKeyParams): Promise<Result<boolean>> => {
      try {
        deps.logger?.debug(`Deleting key: ${params.keyId}`);

        const deleteResult = await deps.keyService.delete(params.keyId);

        if (!deleteResult.isSuccess) {
          deps.logger?.error(`Failed to delete key: ${deleteResult.errorMessage}`);
          return Result.fail(
            `Failed to delete key: ${deleteResult.errorMessage}`,
            deleteResult.errorCause
          );
        }

        deps.logger?.debug(`Key deleted successfully: ${params.keyId}`);
        return Result.success(deleteResult.value);
      } catch (error) {
        const errorMessage = `Unexpected error deleting key: ${error instanceof Error ? error.message : 'Unknown error'}`;
        deps.logger?.error(errorMessage, error);
        return Result.fail(errorMessage, error instanceof Error ? error : undefined);
      }
    }
  };
}
