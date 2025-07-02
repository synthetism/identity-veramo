import type {  Query } from '@synet/patterns';
import type { SynetVerifiableCredential } from '@synet/credentials';

// Queries
export interface GetCredentialQuery extends Query<SynetVerifiableCredential | null> {
  queryId: 'GET_CREDENTIAL';
  vcId: string;
  source?: 'vault' | 'kms' | 'both';
}

export interface ListCredentialsQuery extends Query<SynetVerifiableCredential[]> {
  queryId: 'LIST_CREDENTIALS';
  vaultId?: string;
  type?: string;
  issuer?: string;
}