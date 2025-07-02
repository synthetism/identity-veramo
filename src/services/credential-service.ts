// services/credential-service.ts
export class CredentialService {
  constructor(
    private app: AppUseCases,
    private logger?: Logger,
  ) {}

  async issueCredential(params: IssueCredentialParams): Promise<Result<SynetVerifiableCredential>> {
    // Direct delegation to command
    return this.app.credentials.commands.issue(params);
  }

  async getCredential(vcId: string): Promise<Result<SynetVerifiableCredential | null>> {
    // Direct delegation to query
    return this.app.credentials.queries.getCredential({ vcId });
  }

  async storeCredential(credential: SynetVerifiableCredential, vaultId?: string): Promise<Result<void>> {
    return this.app.credentials.commands.store({ credential, vaultId });
  }
}