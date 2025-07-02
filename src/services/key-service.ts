// services/key-service.ts
import type { Result } from "@synet/patterns";
import type { Logger } from "@synet/logger";
import type { IKey, TKeyType, KeyMetadata } from "@synet/identity-core";
import type { UseCases } from "../application/use-cases";
import type { CreateKeyParams } from "../application/use-cases/key/commands/create-key.command";

export class KeyService {
  constructor(
    private useCases: UseCases,
    private logger?: Logger,
  ) {}

  async createKey(params: CreateKeyParams): Promise<Result<IKey>> {
    return this.useCases.key.commands.create(params);
  }

  async getKey(keyId: string): Promise<Result<IKey | null>> {
    return this.useCases.key.queries.getKey(keyId);
  }

  async deleteKey(keyId: string): Promise<Result<boolean>> {
    return this.useCases.key.commands.delete({ keyId });
  }
}
