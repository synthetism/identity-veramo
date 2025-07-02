import { Result } from "@synet/patterns";
import type { SynetVerifiableCredential } from "@synet/credentials";
import type { IVCServiceProvider } from "../../../../shared/provider";
import type { IVaultOperator } from "@synet/vault-core";
import type { Logger } from "@synet/logger";
import type {CredentialgDependencies} from "../types";



export const getCredentialQuery = (deps: CredentialgDependencies) => {
  return async (credentialId: string): Promise<Result<SynetVerifiableCredential | null>> => {
    try {
      deps.logger?.debug(`Getting credential with ID: ${credentialId}`);
      
      const result = await deps.vcService.getVC(credentialId);
      
      if (!result.isSuccess) {
        deps.logger?.error(`Failed to get credential: ${result.errorMessage}`);
        return Result.fail(
          `Failed to get credential: ${result.errorMessage}`,
          result.errorCause
        );
      }

      return Result.success(result.value);
    } catch (error) {
      const errorMessage = `Unexpected error getting credential: ${error instanceof Error ? error.message : 'Unknown error'}`;
      deps.logger?.error(errorMessage, error);
      return Result.fail(errorMessage, error instanceof Error ? error : undefined);
    }
  };
};
