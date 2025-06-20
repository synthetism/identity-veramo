import type { IIndexer } from "@synet/patterns/storage";
import type { IndexEntry } from "./types";

/**
 * Interface for IDL indexer operations
 * Provides lookup between alias, DID, and key references
 */
export interface IFileVCIndexer  {
  /**
   * Check if the index exists
   */
  exists(): boolean;

  find(keyword: string): Promise<IndexEntry | null>;

  /**
   * Find entry by alias
   */
  findByAlias(alias: string): Promise<IndexEntry | null>;

  /**
   * Find entry by DID
   */
  findById(did: string): Promise<IndexEntry | null>;

  /**
   * Check if alias exists in index
   */
  aliasExists(alias: string): Promise<boolean>;

  /**
   * Unified lookup by alias or DID
   */
  get(aliasOrDid: string): Promise<IndexEntry | null>;

  /**
   * Add or update entry in the index
   */
  create(entry: IndexEntry): Promise<void>;

  /**
   * Remove entry from the index
   */
  delete(alias: string): Promise<boolean>;

  /**
   * List all entries
   */
  list(): Promise<IndexEntry[]>;

  /**
   * Rebuild index (for recovery or migration)
   */
  rebuild(entries: IndexEntry[]): Promise<void>;
}
