import { Result } from "@synet/patterns";
import type { IKey, TKeyType, KeyMetadata } from "@synet/identity-core";
import type { UseCase } from "../../../../domain/use-case";
import type { KeyDependencies } from "../types";


export interface CreateKeyParams {
  type: TKeyType;
  meta?: KeyMetadata;
}

export function createKeyCommand(deps: KeyDependencies): 
  UseCase<CreateKeyParams, Promise<Result<IKey>>> {

  return {
    execute: async (params: CreateKeyParams): Promise<Result<IKey>> => {
      try {
        deps.logger?.debug(`Creating new key of type: ${params.type}`);

        const keyResult = await deps.keyService.create(params.type, params.meta);

        if (!keyResult.isSuccess || !keyResult.value) {
          deps.logger?.error(`Failed to create key: ${keyResult.errorMessage}`);
          return Result.fail(
            `Failed to create key: ${keyResult.errorMessage}`,
            keyResult.errorCause
          );
        }

        deps.logger?.debug(`Key created successfully: ${keyResult.value.kid}`);
        return Result.success(keyResult.value);
      } catch (error) {
        const errorMessage = `Unexpected error creating key: ${error instanceof Error ? error.message : 'Unknown error'}`;
        deps.logger?.error(errorMessage, error);
        return Result.fail(errorMessage, error instanceof Error ? error : undefined);
      }
    }
  };
}
