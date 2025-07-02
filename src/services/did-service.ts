// services/did-service.ts
import type { Result } from "@synet/patterns";
import type { Logger } from "@synet/logger";
import type { IIdentifier } from "@synet/identity-core";
import type { UseCases } from "../application/use-cases";
import type { CreateDidParams } from "../application/use-cases/did/commands/create-did.command";

export class DidService {
  constructor(
    private useCases: UseCases,
    private logger?: Logger,
  ) {}

  async createDid(params: CreateDidParams): Promise<Result<IIdentifier>> {
    return this.useCases.did.commands.create(params);
  }

  async getDid(did: string): Promise<Result<IIdentifier | null>> {
    return this.useCases.did.queries.getDid(did);
  }

  async findDids(): Promise<Result<IIdentifier[]>> {
    return this.useCases.did.queries.findDids();
  }

  async updateDid(did: string, updates: Partial<IIdentifier>): Promise<Result<IIdentifier>> {
    return this.useCases.did.commands.update({ did, updates });
  }
}
