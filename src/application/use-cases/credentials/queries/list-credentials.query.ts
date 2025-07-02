import { Result } from "@synet/patterns";
import type { SynetVerifiableCredential } from "@synet/credentials";
import type { CredentialDependencies } from "../types";

export const listCredentialsQuery = (deps: CredentialDependencies) => {
  return async (): Promise<Result<SynetVerifiableCredential[]>> => {
    try {
      deps.logger?.debug("Listing all credentials");
      
      const result = await deps.vcService.listVCs();
      
      if (!result.isSuccess) {
        deps.logger?.error(`Failed to list credentials: ${result.errorMessage}`);
        return Result.fail(
          `Failed to list credentials: ${result.errorMessage}`,
          result.errorCause
        );
      }

      return Result.success(result.value || []);
    } catch (error) {
      const errorMessage = `Unexpected error listing credentials: ${error instanceof Error ? error.message : 'Unknown error'}`;
      deps.logger?.error(errorMessage, error);
      return Result.fail(errorMessage, error instanceof Error ? error : undefined);
    }
  };
};
