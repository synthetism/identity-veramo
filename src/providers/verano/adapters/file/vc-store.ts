import VError from "verror";
import type { Logger } from "@synet/logger";
import type { AbstractVCStore } from "../../domain/interfaces/abstract-vc-store";
import type { SynetVerifiableCredential, BaseCredentialSubject } from "@synet/credentials";
import type { IFileSystem } from "../../../../shared/filesystem/filesystem.interface";
import type { AdapterData } from "@synet/vault-core";

export class VCStore implements AbstractVCStore {
  constructor(

      private readonly filesystem: IFileSystem,
      private readonly filePath: string,
      private readonly logger?: Logger,
  ) {
  
  }

  async exists(id: string): Promise<boolean> {
    try {
      const data = this.loadData();
      return (id in data);
    } catch (error: unknown) {
      throw new VError(
        {
          name: "VaultVCStoreError",
          cause: error instanceof Error ? error : undefined,
        },
        `Failed to check existence of VC with id: ${id}`,
      );
    }
  }

  async create(id: string, item: SynetVerifiableCredential): Promise<void> {
    try {
      const data = this.loadData();
      data[id] = item;
      this.saveData(data);

      this.logger?.debug(`Saved VC with id: ${id} to vault`);
      
    } catch (error: unknown) {
      throw new VError(
        {
          name: "VaultVCStoreError",
          cause: error instanceof Error ? error : undefined,
        },
        `Failed to create VC with id: ${id}`,
      );
    }
  }

  async get(id: string): Promise<SynetVerifiableCredential | null> {
    try {
      const data = this.loadData();
      return data[id] || null;
    } catch (error: unknown) {
      throw new VError(
        {
          name: "VaultVCStoreError",
          cause: error instanceof Error ? error : undefined,
        },
        `Failed to get VC with id: ${id}`,
      );
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const data = this.loadData();
      if (!(id in data)) return false;

      delete data[id];
      this.saveData(data);
      return true;
    } catch (error: unknown) {
      throw new VError(
        {
          name: "VaultVCStoreError",
          cause: error instanceof Error ? error : undefined,
        },
        `Failed to delete VC with id: ${id}`,
      );
    }
  }

  async list(): Promise<SynetVerifiableCredential[]> {
    try {
      const data = this.loadData();
      return Object.values(data);
    } catch (error: unknown) {
      this.logger?.error(`Error listing VCs: ${error instanceof Error ? error.message : String(error)}`);
      throw new VError(
        {
          name: "VaultVCStoreError",
          cause: error instanceof Error ? error : undefined,
        },
        'Failed to list VCs',
      );
    }
  }

    private loadData(): AdapterData['vcs'] {
    if (!this.filesystem.existsSync(this.filePath)) {
      return {};
    }
    try {
      return JSON.parse(this.filesystem.readFileSync(this.filePath));
    } catch {
      return {};
    }
  }

  private saveData(data: AdapterData['vcs']) {

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