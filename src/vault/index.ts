
import type { Logger } from "@synet/logger";
import os from "node:os";
import path from "node:path";
import { getNullLogger } from "@synet/logger";
import { FileVaultStorage } from "./services/file-vault-storage";
import { VaultOperator } from "./services/vault-operator";

// Export types

export type { IdentityVault, IdentityFile } from "@synet/vault-core";
export type { VaultId } from "./domain/value-objects/vault-id";

import type { IFileSystem } from "../shared/filesystem/promises/filesystem.interface";
import type { IFileSystem as  IFileSystemSync } from "../shared/filesystem/filesystem.interface";
import { VaultSynchronizer } from "./services/vault-synchronizer";
import type { IVaultOperator } from "@synet/vault-core";
import { fileSystemChangeEmitter, type FileChangeEvent, type AdapterData } from "@synet/vault-core";


export interface VaultOptions  { 
  storeDir?: string; // Directory to store vault data
}

export interface Vault {
  operator: IVaultOperator;
}

/**
 * VaultService - Creates and configures a complete vault system
 */
export function createVault(
  filesystem: IFileSystem,
  veramoFilesystem: IFileSystemSync,
  options: VaultOptions = {},
  logger?: Logger,
): Vault {

  const effectiveLogger = logger || getNullLogger();
  const storeDir = options.storeDir || path.join(os.homedir(), ".synet");
 
  const eventEmitter = fileSystemChangeEmitter;
  //const observableFilesystem = new ObservableFileSystem(filesystem,eventEmitter, effectiveLogger);
  //const dynamicFs = new DynamicVaultFilesystem(filesystem, storeDir, logger);
    
   const vaultStorage = new FileVaultStorage(
    storeDir,
    filesystem, // Use regular filesystem for vault storage
    effectiveLogger.child('STORAGE')
  );
  const synchronizer = new VaultSynchronizer(
      filesystem,
      vaultStorage,
      storeDir,
      effectiveLogger.child('SYNC')
  );

  const operator = new VaultOperator(
    vaultStorage,
    synchronizer,
    effectiveLogger.child('OPERATOR')
  );

  return {
    operator
  } as Vault;

}

// Export all the components
export { VaultOperator } from "./services/vault-operator";
