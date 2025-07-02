// services/credential-service.ts
import type { Result } from "@synet/patterns";
import type { Logger } from "@synet/logger";
import type { SynetVerifiableCredential } from "@synet/credentials";
import type { UseCases } from "../application/use-cases";
import type { IssueCredentialParams } from "../application/use-cases/credentials/types/params/issue-credential.params";

export class CredentialService {
  constructor(
    private useCases: UseCases,
    private logger?: Logger,
  ) {}

  async issueCredential(params: IssueCredentialParams): Promise<Result<SynetVerifiableCredential>> {
    // Direct delegation to command
    return this.useCases.credentials.commands.issue(params);
  }

  async getCredential(vcId: string): Promise<Result<SynetVerifiableCredential | null>> {
    // Direct delegation to query
    return this.useCases.credentials.queries.getCredential(vcId);
  }

  async listCredentials(): Promise<Result<SynetVerifiableCredential[]>> {
    return this.useCases.credentials.queries.listCredentials();
  }

  async storeCredential(credential: SynetVerifiableCredential, vaultId?: string): Promise<Result<void>> {
    return this.useCases.credentials.commands.store({ credential, vaultId });
  }
}