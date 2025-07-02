
import type { QueryHandler } from '@synet/patterns';
import type { IVaultOperator } from '@synet/vault-core';
import type {Logger} from '@synet/logger';
import { IdentityVault } from '@synet/vault-core';

import type {IVCServiceProvider} from '../../../../shared/provider';
import type {SynetVerifiableCredential} from '@synet/credentials';
import type { GetCredentialQuery } from './get-credential.query';

export class GetCredentialHandler implements QueryHandler<GetCredentialQuery, SynetVerifiableCredential | null> {
  constructor(
    private vcService: IVCServiceProvider,
    private vaultOperator: IVaultOperator,
    private logger?: Logger
  ) {}

  async handle(query: GetCredentialQuery): Promise<SynetVerifiableCredential | null> {
    switch (query.source) {
      case 'vault':
        return this.getFromVault(query.vcId);
      case 'kms':
        return this.getFromKMS(query.vcId);
      default: {
        // Try vault first, then KMS
        const vaultVc = await this.getFromVault(query.vcId);
        if (vaultVc) return vaultVc;
        return this.getFromKMS(query.vcId);
      }
    }
  }

  private async getFromVault(vcId: string): Promise<SynetVerifiableCredential | null> {
    const currentVaultId = this.vaultOperator.getCurrentVaultId();
    if (!currentVaultId) return null;

    const vaultResult = await this.vaultOperator.getVault(currentVaultId);
    if (!vaultResult.isSuccess) return null;

    return vaultResult.value.findVC(vcId) || null;
  }

  private async getFromKMS(vcId: string): Promise<SynetVerifiableCredential | null> {
    const result = await this.vcService.getVC(vcId);
    return result.isSuccess ? result.value : null;
  }
}