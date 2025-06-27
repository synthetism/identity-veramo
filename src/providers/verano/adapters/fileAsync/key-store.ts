import type { IKey, ManagedKeyInfo } from "@veramo/core";
import { AbstractKeyStore } from "@veramo/key-manager";
import VError  from "verror";
import type { Logger } from "@synet/logger";
import type { IFileSystem } from "../../../../shared/filesystem/promises/filesystem.interface";
import type { AdapterData } from "@synet/vault-core";
// File-based key store implementation
export class KeyStore extends AbstractKeyStore {


  constructor(
    private filesystem: IFileSystem,
    private filePath: string,
    private readonly logger?: Logger,
  ) {
    
    super();
  }

  async getKey({ kid }: { kid: string }): Promise<IKey> {
    const data = await this.loadData();
    return data[kid] || null;
  }

  async deleteKey({ kid }: { kid: string }): Promise<boolean> {
    const data = await this.loadData();
    delete data[kid];
    await this.saveData(data);
    return true;
  }

  async importKey(args: IKey): Promise<boolean> {
    try {
      const data = await this.loadData();
      data[args.kid] = args;
      await this.saveData(data);
      return true;
    } catch (error) {
      this.logger?.error("Error importing key:", error);
      return false;
    }
  }

  async listKeys(): Promise<ManagedKeyInfo[]> {
    const data = await this.loadData();
    return Object.values(data.keys) as ManagedKeyInfo[];
  }

  private async loadData(): Promise<AdapterData['keys'] | Record<string, IKey>> {
    if (!this.filesystem.exists(this.filePath)) {
      return {};
    }
    try {
      return JSON.parse(await this.filesystem.readFile(this.filePath));
    } catch {
      return {};
    }
  }

  private async saveData(data: Record<string, IKey>) {

    try {
        await this.filesystem.writeFile(this.filePath, JSON.stringify(data, null, 2));
        } catch (error: unknown) {
          this.logger?.error(`Error saving Key data: ${error instanceof Error ? error.message : String(error)}`);
           throw new VError(
            { 
              name: "FileKeyStoreError", 
              cause: error instanceof Error ? error : undefined, 
            },
            `Failed to save Key data to file: ${this.filePath}`,
          );
        }
    }
  }

