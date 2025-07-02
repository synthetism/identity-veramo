import { Result } from "@synet/patterns";
import type { ManagedPrivateKey } from "@synet/identity-core";
import type { KeyDependencies } from "../types";


export const getPrivateKeyQuery = (deps: KeyDependencies) => {
  return async (keyId: string): Promise<Result<ManagedPrivateKey | null>> => {
    try {
      deps.logger?.debug(`Getting private key: ${keyId}`);
      
      const result = await deps.privateKeyService.get(keyId);
      
      if (!result.isSuccess) {
        deps.logger?.error(`Failed to get key: ${result.errorMessage}`);
        return Result.fail(
          `Failed to get private key: ${result.errorMessage}`,
          result.errorCause
        );
      }
      const privateKey = result.value;

      return Result.success(privateKey);

    } catch (error) {
      const errorMessage = `Unexpected error getting key: ${error instanceof Error ? error.message : 'Unknown error'}`;
      deps.logger?.error(errorMessage, error);
      return Result.fail(errorMessage, error instanceof Error ? error : undefined);
    }
  };
};


