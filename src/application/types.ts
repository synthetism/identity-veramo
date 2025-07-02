// application/use-cases/types.ts
import type { Logger } from '@synet/logger';
import type { IVaultOperator } from '@synet/vault-core';
import type { IDidServiceProvider, IKeyServiceProvider, IVCServiceProvider } from '../../shared/provider';

export interface Dependencies {
  didService: IDidServiceProvider;
  keyService: IKeyServiceProvider;
  vcService: IVCServiceProvider;
  vaultOperator: IVaultOperator;
  logger?: Logger;
}