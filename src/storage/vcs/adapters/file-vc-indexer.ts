import path from "node:path";
import type { IndexEntry, IndexRecord } from "../types";
import type { IFileVCIndexer } from "../file-vc-indexer.interface";
import type { IFileSystem } from "../../filesystem/filesystem.interface";
import type { Logger } from "@synet/logger";

/**
 * File-based implementation of the VC indexer
 */
export class FileVCIndexer implements IFileVCIndexer {
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
        (entry) => entry.alias === keyword || entry.id === keyword,
      ) || null
    );
  }

  findByAlias(alias: string): IndexEntry | null {
    const index = this.loadIndex();
    return index[alias] || null;
  }

  findById(id: string): IndexEntry | null {
    const index = this.loadIndex();

    // Find entry by ID
    for (const alias in index) {
      if (index[alias].id === id) {
        return index[alias];
      }
    }

    return null;
  }

  aliasExists(alias: string): boolean {
    return this.findByAlias(alias) !== null;
  }

  get(aliasOrId: string): IndexEntry | null {
    // First try as alias
    const byAlias = this.findByAlias(aliasOrId);
    if (byAlias) return byAlias;

    // Then try as ID
    return this.findById(aliasOrId);
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
      `Added index entry for "${entry.alias}" (${entry.id})`,
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
      if (entry.alias && entry.id) {
        newIndex[entry.alias] = {
          ...entry,
          createdAt: entry.createdAt || new Date().toISOString(),
        };
      } else {
        this.logger?.warn("Invalid entry: missing alias or id");
      }
    }

    this.saveIndex(newIndex);
    this.logger?.info(`Rebuilt index with ${entries.length} entries`);
  }

  private ensureIndexDirectory(): void {
    try {
      const indexDir = path.dirname(this.indexPath);
      if (!this.filesystem.existsSync(indexDir)) {
        this.filesystem.ensureDir(indexDir);
      }
    } catch (error) {
      this.logger?.error("Error ensuring index directory:", error);
      throw new Error(`Failed to create index directory: ${error}`);
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
      } else if (Array.isArray(parsed.vcs)) {
        // Migration from old array format
        const entries: IndexRecord = {};
        for (const entry of parsed.vcs) {
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
      this.logger?.error("Error loading VC index:", error);
      return {};
    }
  }

  private saveIndex(indexRecord: IndexRecord): void {
    try {
      const withVersion = {
        entries: indexRecord,
        version: "1.0.0",
      };
      
      this.filesystem.writeFile(
        this.indexPath,
        JSON.stringify(withVersion, null, 2),
      );

      this.index = indexRecord;
    } catch (error) {
      this.logger?.error("Error saving VC index:", error);
      throw new Error(`Failed to save index: ${error}`);
    }
  }
}