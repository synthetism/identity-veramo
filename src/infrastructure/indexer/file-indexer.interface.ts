import type { IIndexer } from "@synet/patterns/storage";
import type { IndexEntry } from "./types";

/**
 * Interface for IDL indexer operations
 * Provides lookup between alias, DID, and key references
 */
export interface IFileIndexer extends IIndexer<IndexEntry> {
  /**
   * Check if the index exists
   */
  exists(): boolean;

  find(keyword: string): IndexEntry | null;

  /**
   * Find entry by alias
   */
  findByAlias(alias: string): IndexEntry | null;

  /**
   * Find entry by DID
   */
  findById(did: string): IndexEntry | null;

  /**
   * Check if alias exists in index
   */
  aliasExists(alias: string): boolean;

  /**
   * Unified lookup by alias or DID
   */
  get(aliasOrDid: string): IndexEntry | null;

  /**
   * Add or update entry in the index
   */
  create(entry: IndexEntry): void;

  /**
   * Remove entry from the index
   */
  delete(alias: string): boolean;

  /**
   * List all entries
   */
  list(): IndexEntry[];

  /**
   * Rebuild index (for recovery or migration)
   */
  rebuild(entries: IndexEntry[]): void;
}
