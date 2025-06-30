import type { Logger } from "@synet/logger";
import { 
  KeyStore, 
  PrivateKeyStore, 
  DIDStore, 
  VCStore,
} from "./file";

import type { AbstractKeyStore } from "@synet/vault-core";
import type { AbstractPrivateKeyStore } from "@synet/vault-core";
import type { AbstractDIDStore } from "@synet/vault-core";
import type { AbstractVCStore } from "../domain/interfaces/abstract-vc-store";
import type { SynetVerifiableCredential, BaseCredentialSubject } from "@synet/credentials";
import type { IFileSystem } from "@synet/patterns/fs";
import { DynamicVaultFilesystem } from "../../../shared/filesystem/dynamic-filesystem";

// Common interface for all adapter types
export interface StorageAdapters {
  keyStore: AbstractKeyStore;
  privateKeyStore: AbstractPrivateKeyStore;
  didStore: AbstractDIDStore;
  vcStore: AbstractVCStore;
}

/**
 * Creates all necessary storage adapters for identity services
 */
export function createAdapters(
  storeDir: string,
  filesystem: IFileSystem,
  logger?: Logger,
): StorageAdapters {

   const dynamicFs = new DynamicVaultFilesystem(filesystem, storeDir, logger);
    
  // Create paths for different stores
  const keyStorePath =  "keystore.json";
  const privateKeyStorePath = "private-keystore.json";
  const didStorePath = "didstore.json";
  const vcStorePath = "vcstore.json";

  // Create all adapters with VaultManager
  return {
    keyStore: new KeyStore(dynamicFs, keyStorePath, logger),
    privateKeyStore: new PrivateKeyStore(dynamicFs, privateKeyStorePath, logger),
    didStore: new DIDStore(dynamicFs, didStorePath, logger),
    vcStore: new VCStore(dynamicFs, vcStorePath, logger),
  };
}