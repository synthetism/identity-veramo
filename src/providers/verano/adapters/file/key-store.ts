import type { IKey } from "@veramo/core";
import { AbstractKeyStore } from "@veramo/key-manager";
import VError  from "verror";
import type { Logger } from "@synet/logger";
import type { IFileSystem } from "../../../../shared/filesystem/filesystem.interface";
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
    const data = this.loadData();
    return data[kid] || null;
  }

  async deleteKey({ kid }: { kid: string }): Promise<boolean> {
    const data = this.loadData();
    delete data[kid];
    this.saveData(data);
    return true;
  }

  async importKey(args: IKey): Promise<boolean> {
    try {
      const data = this.loadData();
      data[args.kid] = args;
      this.saveData(data);
      return true;
    } catch (error) {
      this.logger?.error("Error importing key:", error);
      return false;
    }
  }

  async listKeys(): Promise<Exclude<IKey, "privateKeyHex">[]> {
    const data = this.loadData();
    return Object.values(data.keys) as Exclude<IKey, "privateKeyHex">[];
  }

  private loadData(): AdapterData['keys'] | Record<string, IKey> {
    if (!this.filesystem.existsSync(this.filePath)) {
      return {};
    }
    try {
      return JSON.parse(this.filesystem.readFileSync(this.filePath));
    } catch {
      return {};
    }
  }

  private saveData(data: Record<string, IKey>) {

    try {
        this.filesystem.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
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

