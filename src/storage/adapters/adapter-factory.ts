import type { Logger } from "@synet/logger";
import type { IFileSystem } from "../filesystem/filesystem.interface";
import { 
  FileKeyStore, 
  FilePrivateKeyStore, 
  FileDIDStore, 
} from "./file";
import path from "node:path";

// Common interface for all adapter types
export interface StorageAdapters {
  keyStore: FileKeyStore;
  privateKeyStore: FilePrivateKeyStore;
  didStore: FileDIDStore;
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

  // Create all adapters
  return {
    keyStore: new FileKeyStore(keyStorePath, logger),
    privateKeyStore: new FilePrivateKeyStore(privateKeyStorePath, logger),
    didStore: new FileDIDStore(didStorePath, logger),

  };
}