import type { Logger } from "@synet/logger";
import type { IFileSystem } from "../filesystem/filesystem.interface";
import { 
  FileKeyStore, 
  FilePrivateKeyStore, 
  FileDIDStore, 
  FileVCStore 
} from "./file";
import path from "node:path";

// Common interface for all adapter types
export interface StorageAdapters {
  keyStore: FileKeyStore;
  privateKeyStore: FilePrivateKeyStore;
  didStore: FileDIDStore;
  vcStore: FileVCStore;
}

// Options for adapter creation
export interface AdapterFactoryOptions {
  storeDir: string;
  filesystem: IFileSystem;
  logger?: Logger;
}

/**
 * Creates all necessary storage adapters for identity services
 */
export function createStorageAdapters(options: AdapterFactoryOptions): StorageAdapters {
  const { storeDir, filesystem, logger } = options;
  
  // Ensure storage directory exists
  filesystem.ensureDirSync(storeDir);
  
  // Create paths for different stores
  const keyStorePath = path.join(storeDir, "keystore.json");
  const privateKeyStorePath = path.join(storeDir, "private-keystore.json");
  const didStorePath = path.join(storeDir, "didstore.json");
  const vcStoreDir = path.join(storeDir, "credentials");
  
  // Ensure VC directory exists
  filesystem.ensureDirSync(vcStoreDir);
  
  // Create all adapters
  return {
    keyStore: new FileKeyStore(keyStorePath, logger),
    privateKeyStore: new FilePrivateKeyStore(privateKeyStorePath, logger),
    didStore: new FileDIDStore(didStorePath, logger),
    vcStore: new FileVCStore(vcStoreDir, filesystem, logger)
  };
}