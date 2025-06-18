import type { IFileSystem } from "../filesystem/filesystem.interface";
import type { IFileIndexer } from "./file-indexer.interface";
import type { Logger } from "@synet/logger";
import { FileIndexer } from "./file-indexer";

/**
 * Create an IDL indexer with file system persistence
 */
export function createIndexer(
  storeDir: string,
  filesystem: IFileSystem,
  logger?: Logger,
): IFileIndexer {
  return new FileIndexer(storeDir, filesystem, logger);
}
