// application/use-cases/credentials/commands/issue-credential.command.ts
import type { Dependencies } from '../../../types';
import { Result } from '@synet/patterns';
import type { SynetVerifiableCredential, BaseCredentialSubject } from '@synet/credentials';
import { IdentityVault } from '@synet/vault-core';

export interface IssueCredentialParams {
  subject: BaseCredentialSubject;
  credentialType: string[];
  issuerDid?: string;
  addToVault?: boolean;
  options?: {
    vcId?: string;
    context?: string[];
    issuanceDate?: string;
    expirationDate?: string;
  };
}

export const issueCredentialCommand = (deps: Dependencies) => ({
  async execute(params: IssueCredentialParams): Promise<Result<SynetVerifiableCredential>> {
    try {
      // Issue VC using provider service
      const vcResult = await deps.vcService.issueVC(
        params.subject,
        params.credentialType,
        params.issuerDid,
      );

      if (!vcResult.isSuccess) {
        return Result.fail(`Failed to issue credential: ${vcResult.errorMessage}`);
      }

      const vc = vcResult.value;

      // Add to vault if requested
      if (params.addToVault) {
        const currentVaultId = deps.vaultOperator.getCurrentVaultId();
        if (currentVaultId) {
          const vaultResult = await deps.vaultOperator.getVault(currentVaultId);
          if (vaultResult.isSuccess) {
            const vault = vaultResult.value;
            const updatedVault = IdentityVault.create({
              ...vault.toDomain(),
              vcStore: [...vault.vcStore, vc]
            });

            if (updatedVault.isSuccess) {
              await deps.vaultOperator.updateVault(updatedVault.value);
            }
          }
        }
      }

      return Result.success(vc);
    } catch (error) {
      return Result.fail(`Failed to issue credential: ${error}`);
    }
  }
});