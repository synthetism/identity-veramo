import type { BaseCredentialSubject } from '@synet/credentials';

export interface IssueCredentialParams<S extends BaseCredentialSubject = BaseCredentialSubject> {
  subject: S;  // Now generic instead of locked to BaseCredentialSubject
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