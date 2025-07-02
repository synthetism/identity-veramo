import type { Command, Query } from '@synet/patterns';
import type { SynetVerifiableCredential, BaseCredentialSubject } from '@synet/credentials';
// Commands
export interface IssueCredentialCommand extends Command<SynetVerifiableCredential> {
 
  type: 'ISSUE_CREDENTIAL';
  subject: BaseCredentialSubject;
  credentialType: string[];
  issuerDid?: string;
  addToVault?: boolean; // Option to add to active vault
  options?: {
    vcId?: string;
    context?: string[];
    issuanceDate?: string;
    expirationDate?: string;
  };
}

export interface StoreCredentialCommand extends Command<void> {
  type: 'STORE_CREDENTIAL';
  credential: SynetVerifiableCredential;
  vaultId?: string; // Optional specific vault
}
