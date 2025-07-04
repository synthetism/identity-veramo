import path from "node:path";
import type { IndexEntry, IndexRecord } from "./types";
import type { IIndexer } from "@synet/patterns/storage";
import type { IFileSystem } from "@synet/patterns/filesystem";
import type { Logger } from "@synet/logger";

/**
 * File-based implementation of the IDL indexer
 */
export class FileIndexer implements IIndexer<IndexEntry> {
  private indexPath: string;
  private index: IndexRecord | null = null;

  constructor(
    private storeDir: string,
    private indexName: string,
    private filesystem: IFileSystem,
    private logger?: Logger,
  ) {
    this.indexPath = path.join(storeDir, `${indexName}-index.json`);
    this.ensureIndexDirectory();
  }

  exists(): boolean {
    return this.filesystem.existsSync(this.indexPath);
  }

  find(keyword: string): IndexEntry | null {
    const index = this.loadIndex();
    return (
      Object.values(index).find(
        (entry) => entry.alias === keyword || entry.did === keyword,
      ) || null
    );
  }

  findByAlias(alias: string): IndexEntry | null {
    const index = this.loadIndex();
    return index[alias] || null;
  }

  findById(did: string): IndexEntry | null {
    const index = this.loadIndex();

    // Find entry by DID
    for (const alias in index) {
      if (index[alias].did === did) {
        return index[alias];
      }
    }

    return null;
  }

  aliasExists(alias: string): boolean {
    return this.findByAlias(alias) !== null;
  }

  get(aliasOrDid: string): IndexEntry | null {
    // First try as alias
    const byAlias = this.findByAlias(aliasOrDid);
    if (byAlias) return byAlias;

    // Then try as DID
    return this.findById(aliasOrDid);
  }

  create(entry: IndexEntry): void {
    const index = this.loadIndex();

    // Add or update entry
    index[entry.alias] = {
      ...entry,
      createdAt: entry.createdAt || new Date().toISOString(),
    };

    this.saveIndex(index);
    this.logger?.debug(
      `Created index entry for "${entry.alias}" (${entry.did})`,
    );
  }

  delete(alias: string): boolean {
    const index = this.loadIndex();

    if (index[alias]) {
      delete index[alias];
      this.saveIndex(index);
      this.logger?.debug(`Removed index entry for "${alias}"`);
      return true;
    }

    return false;
  }

  list(): IndexEntry[] {
    const index = this.loadIndex();
    return Object.values(index);
  }

  rebuild(entries: IndexEntry[]): void {
    const newIndex: Record<string, IndexEntry> = {};

    for (const entry of entries) {
      if (entry.alias && entry.did) {
        newIndex[entry.alias] = {
          ...entry,
          createdAt: entry.createdAt || new Date().toISOString(),
        };
      } else {
        this.logger?.warn("Invalid DID entry: missing alias or did");
      }
    }

    this.saveIndex(newIndex);

  }

  private ensureIndexDirectory(): void {
    const indexDir = path.dirname(this.indexPath);
    if (!this.filesystem.existsSync(indexDir)) {
      this.filesystem.ensureDirSync(indexDir);
    }
  }

  private loadIndex(): IndexRecord {
    if (!this.exists()) {
      return {}; // Simple empty object
    }

    try {
      if (this.index) {
        return this.index;
      }

      const content = this.filesystem.readFileSync(this.indexPath);
      const parsed = JSON.parse(content);

      // Handle potential version or structure differences here
      // but return a consistent IndexRecord format

      if (parsed.entries) {
        // New format with version
        this.index = parsed.entries;
      } else if (Array.isArray(parsed.dids)) {
        // Migration from old array format
        const entries: IndexRecord = {};
        for (const entry of parsed.dids) {
          entries[entry.alias] = entry;
        }
        this.index = entries;

        // Save in new format (optional)
        this.saveIndex(entries);
      } else {
        // Assume it's already in the right format
        this.index = parsed;
      }

      return this.index || {};
    } catch (error) {
      this.logger?.error("Error loading identity index:", error);
      return {};
    }
  }

  private saveIndex(indexRecord: IndexRecord): void {
    // You can decide to save with or without version info
    // Option 1: Just save the record directly (simplest)
    /* this.filesystem.writeFile(
      this.indexPath, 
      JSON.stringify(indexRecord, null, 2)
    ); */

    // Option 2: Include version info if you want

    const withVersion = {
      entries: indexRecord,
      version: "1.0.0",
    };
    this.filesystem.writeFileSync(
      this.indexPath,
      JSON.stringify(withVersion, null, 2),
    );

    this.index = indexRecord;
  }
}
