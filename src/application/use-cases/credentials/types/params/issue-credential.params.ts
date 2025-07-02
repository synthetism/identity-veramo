import type { BaseCredentialSubject } from '@synet/credentials';

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
