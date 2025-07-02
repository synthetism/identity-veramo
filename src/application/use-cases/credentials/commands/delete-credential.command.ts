import { Result } from '@synet/patterns';
import type { UseCase } from '../../../../domain/use-case';
import type { CredentialDependencies } from "../types";

export function deleteCredentialCommand(deps: CredentialDependencies):
  UseCase<string, Promise<Result<void>>> {

  return {
    execute: async (vcId: string): Promise<Result<void>> => {
      try {
        // Delete VC using provider service
        const deleteResult = await deps.vcService.deleteVC(vcId);

        if (!deleteResult.isSuccess) {
          return Result.fail(`Failed to delete credential: ${deleteResult.errorMessage}`);
        }

        if (!deleteResult.value) {
          return Result.fail(`Credential with ID ${vcId} not found`);
        }

        return Result.success(undefined);
      } catch (error) {
        return Result.fail(`Failed to delete credential: ${error}`);
      }
    },
  };
}