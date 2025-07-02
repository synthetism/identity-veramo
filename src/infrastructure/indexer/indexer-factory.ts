import type { IFileSystem } from "@synet/patterns/filesystem";
import type { IFileIndexer } from "./file-indexer.interface";
import type { Logger } from "@synet/logger";
import { FileIndexer } from "./file-indexer";

/**
 * Create an IDL indexer with file system persistence
 */
export function createIndexer(
  storeDir: string,
  indexName: string,
  filesystem: IFileSystem,
  logger?: Logger,
): IFileIndexer {
  return new FileIndexer(storeDir, indexName, filesystem, logger);
}
