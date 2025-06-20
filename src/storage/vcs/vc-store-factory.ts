import type { Logger } from "@synet/logger";
import type { IFileSystem } from "../filesystem/filesystem.interface";

import type { IVCStore } from "./vc-store.interface";
import {FileVCStore} from "./adapters/file-vc-store";
import { FileVCIndexer } from "./adapters/file-vc-indexer";
export interface AdapterFactoryOptions {
  storeDir: string;
  filesystem: IFileSystem;
  logger?: Logger;
}



/**
 * Creates all necessary storage adapters for identity services
 */
export function createVCStore<T>(options: AdapterFactoryOptions): IVCStore<T> {
  const { storeDir, filesystem, logger } = options;
  
  // Ensure storage directory exists
  filesystem.ensureDirSync(storeDir);  

  return new FileVCStore<T>(storeDir, filesystem, logger);
  
}

export function createVCIndexer(options: AdapterFactoryOptions): FileVCIndexer {
  const { storeDir, filesystem, logger } = options;
  
  return new FileVCIndexer(storeDir, 'vc', filesystem, logger);
}