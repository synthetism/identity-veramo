import { Result } from "@synet/patterns";
import type { UseCase } from "../../../../domain/use-case";
import type { IIdentifier } from "@synet/identity-core";
import type { DidDependencies } from "../types";


export interface CreateDidParams {
  vaultId?: string;
  options?: {
    keyType?: string;
    provider?: string;
  };
}

export function createDidCommand(deps: DidDependencies): 
  UseCase<CreateDidParams, Promise<Result<IIdentifier>>> {

  return {
    execute: async (params: CreateDidParams): Promise<Result<IIdentifier>> => {
      try {
        deps.logger?.debug("Creating new DID");

        // Use the current vault or the provided vaultId
        const vaultId = params.vaultId || deps.vaultOperator.getCurrentVaultId();
        
        if (!vaultId) {
          return Result.fail("No vault ID provided or available");
        }

        const didResult = await deps.didService.create(vaultId);

        if (!didResult.isSuccess || !didResult.value) {
          deps.logger?.error(`Failed to create DID: ${didResult.errorMessage}`);
          return Result.fail(
            `Failed to create DID: ${didResult.errorMessage}`,
            didResult.errorCause
          );
        }

        deps.logger?.debug(`DID created successfully: ${didResult.value.did}`);
        return Result.success(didResult.value);
      } catch (error) {
        const errorMessage = `Unexpected error creating DID: ${error instanceof Error ? error.message : 'Unknown error'}`;
        deps.logger?.error(errorMessage, error);
        return Result.fail(errorMessage, error instanceof Error ? error : undefined);
      }
    }
  };
}
