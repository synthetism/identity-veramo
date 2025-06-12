import path from "node:path";
import type { IFileSystem } from "../../domain/interfaces/filesystem.interface";
import type { IIndexer } from "../../domain/interfaces/indexer.interface";
import type { Logger } from "@synet/logger";
import { FileIndexer } from "./file-indexer";

/**
 * Create an IDL indexer with file system persistence
 */
export function createIndexer(
  storeDir: string,
  filesystem: IFileSystem,
  logger?: Logger,
): IIndexer {
  return new FileIndexer(storeDir, filesystem, logger);
}
