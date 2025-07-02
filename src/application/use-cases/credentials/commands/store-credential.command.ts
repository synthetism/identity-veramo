import { Result } from "@synet/patterns";
import type { SynetVerifiableCredential } from "@synet/credentials";
import type { UseCase } from "../../../../domain/use-case";
import { IdentityVault } from "@synet/vault-core";
import type { CredentialgDependencies } from "../types";

export interface StoreCredentialParams {
  credential: SynetVerifiableCredential;
  vaultId?: string;
}

export function storeCredentialCommand(deps: CredentialgDependencies): 
  UseCase<StoreCredentialParams, Promise<Result<void>>> {
 
  const  execute  = async (params: StoreCredentialParams): Promise<Result<void>> => {
      try {
        deps.logger?.debug(`Storing credential: ${params.credential.id}`);

        // Store the credential in the provider
        const storeResult = await deps.vcService.storeVC(params.credential);
        
        if (!storeResult.isSuccess) {
          deps.logger?.error(`Failed to store credential: ${storeResult.errorMessage}`);
          return Result.fail(
            `Failed to store credential: ${storeResult.errorMessage}`,
            storeResult.errorCause
          );
        }

        // Add to vault if vaultId provided or use current vault
        const vaultId = params.vaultId || deps.vaultOperator.getCurrentVaultId();
        if (vaultId) {
          const vaultResult = await deps.vaultOperator.getVault(vaultId);
          if (vaultResult.isSuccess) {
            const vault = vaultResult.value;
            const updatedVault = IdentityVault.create({
              ...vault.toDomain(),
              vcStore: [...vault.vcStore, params.credential]
            });

            if (updatedVault.isSuccess) {
              await deps.vaultOperator.updateVault(updatedVault.value);
            }
          }
        }

        deps.logger?.debug(`Credential stored successfully: ${params.credential.id}`);
        return Result.success(undefined);
      } catch (error) {
        const errorMessage = `Unexpected error storing credential: ${error instanceof Error ? error.message : 'Unknown error'}`;
        deps.logger?.error(errorMessage, error);
        return Result.fail(errorMessage, error instanceof Error ? error : undefined);
      }
    }
   return {
      execute
   };
}
