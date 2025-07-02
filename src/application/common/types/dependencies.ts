// application/use-cases/types.ts
import type { Logger } from '@synet/logger';
import type { IVaultOperator } from '@synet/vault-core';
import type { IDidServiceProvider, IKeyServiceProvider, IVCServiceProvider,IPrivateKeyProvider } from '../../../shared/provider';

export interface Dependencies {
  didService: IDidServiceProvider;
  keyService: IKeyServiceProvider;
  vcService: IVCServiceProvider;
  privateKeyService: IPrivateKeyProvider; // Assuming this is defined in your provider interfaces
  vaultOperator: IVaultOperator;
  logger?: Logger;
}