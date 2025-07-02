import { Result } from '@synet/patterns';
import type { SynetVerifiableCredential } from '@synet/credentials';
import type { UseCase } from '../../../../domain/use-case';
import type { CredentialDependencies } from "../types";

export function verifyCredentialCommand(deps: CredentialDependencies):
  UseCase<SynetVerifiableCredential, Promise<Result<boolean>>> {

  return {
    execute: async (vc: SynetVerifiableCredential): Promise<Result<boolean>> => {
      try {
        // Verify VC using provider service
        const verifyResult = await deps.vcService.verifyVC(vc);

        if (!verifyResult.isSuccess) {
          return Result.fail(`Failed to verify credential: ${verifyResult.errorMessage}`);
        }

        return Result.success(verifyResult.value);
      } catch (error) {
        return Result.fail(`Failed to verify credential: ${error}`);
      }
    },
  };
}