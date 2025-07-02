import path from "node:path";
import lockfile from 'proper-lockfile';  // You'll need to install this package
import type { IndexEntry, IndexRecord } from "../types";
import type { IFileVCIndexer } from "../file-vc-indexer.interface";
import type { IFileSystem } from "@synet/patterns/fs";
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

  async find(keyword: string): Promise<IndexEntry | null> {
    const index = await this.loadIndex();
    return (
      Object.values(index).find(
        (entry) => entry.alias === keyword || entry.id === keyword,
      ) || null
    );
  }

  async findByAlias(alias: string): Promise<IndexEntry | null> {
    const index = await this.loadIndex();
    return index[alias] || null;
  }

  async findById(id: string): Promise<IndexEntry | null> {
    const index = await this.loadIndex();

    // Find entry by ID
    for (const alias in index) {
      if (index[alias].id === id) {
        return index[alias];
      }
    }

    return null;
  }

  async aliasExists(alias: string): Promise<boolean> {
    return (await this.findByAlias(alias)) !== null;
  }

  async get(aliasOrId: string): Promise<IndexEntry | null> {
    // First try as alias
    const byAlias = await this.findByAlias(aliasOrId);
    if (byAlias) return byAlias;

    // Then try as ID
    return await this.findById(aliasOrId);
  }

  async create(entry: IndexEntry): Promise<void> {
    const index = await this.loadIndex();

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

  async delete(alias: string): Promise<boolean> {
    const index = await this.loadIndex();

    if (index[alias]) {
      delete index[alias];
      this.saveIndex(index);
      this.logger?.debug(`Removed index entry for "${alias}"`);
      return true;
    }

    return false;
  }

  async list(): Promise<IndexEntry[]> {
    const index = await this.loadIndex();
    return Object.values(index);
  }

  async rebuild(entries: IndexEntry[]): Promise<void> {
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

    await  this.saveIndex(newIndex);
  }

  private ensureIndexDirectory(): void {
    try {
      const indexDir = path.dirname(this.indexPath);
      if (!this.filesystem.existsSync(indexDir)) {
        this.filesystem.ensureDir(indexDir);
      }

      if( !this.filesystem.existsSync(this.indexPath)) {
        this.filesystem.writeFile(this.indexPath, JSON.stringify({ entries: {}, version: "1.0.0" }, null, 2));
      }
    } catch (error) {
      this.logger?.error("Error ensuring index directory:", error);
      throw new Error(`Failed to create index directory: ${error}`);
    }
  }

  private async loadIndex(): Promise<IndexRecord> {

    if (!this.exists()) {
      return {}; // Simple empty object
    }

    try {

      if(!this.filesystem.existsSync(this.indexPath)) {
        this.logger?.warn(`Index file does not exist: ${this.indexPath}`);
        return {}; // Return empty index if file doesn't exist
      }

      await lockfile.lock(this.indexPath, {
        retries: 10,   // Try 10 times
  
      });

      this.logger?.debug(`Acquired lock for index file: ${this.indexPath}`);

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
      } 
      
      lockfile.unlock(this.indexPath);
     
      return this.index ? this.index : {};

    } catch (error) {
      this.logger?.error("Error loading VC index:", error);
      throw new Error(`Failed to load index: ${error}`);
    }
  }


  private async saveIndex(indexRecord: IndexRecord): Promise<void> {
    try {
       const withVersion = {
        entries: indexRecord,
        version: "1.0.0",
       };


        await lockfile.lock(this.indexPath, {
        retries: 10,   // Try 10 times
  
       });
    
      
      this.filesystem.writeFile(
        this.indexPath,
        JSON.stringify(withVersion, null, 2),
      );

      lockfile.unlock(this.indexPath);

      this.index = indexRecord;
    } catch (error) {
      this.logger?.error("Error saving VC index:", error);
      throw new Error(`Failed to save index: ${error}`);
    }
  }
}