import type { IIdentifier } from "@veramo/core";
import { AbstractDIDStore } from "@veramo/did-manager";
import type { Logger } from "@synet/logger";
import VError  from "verror";
import type { IFileSystem } from "../../../../shared/filesystem/promises/filesystem.interface";
import type { AdapterData } from "@synet/vault-core";
// File-based DID store implementation

export class DIDStore extends AbstractDIDStore {

  constructor(
    private filesystem: IFileSystem,
    private filePath: string,
    private logger?: Logger
  ) {
    super();
    
  }

  async getDID(args: { did: string; alias: string }): Promise<IIdentifier> {
    try {
      
      const data = await this.loadData();
      return data[args.did];

    } catch (error: unknown) {

      this.logger?.error(`Error getting DID: ${error instanceof Error ? error.message : String(error)}`);
      
      throw new VError(
        { 
          name: "FileDIDStoreError", 
          cause: error instanceof Error ? error : undefined, 
        },
        `Failed to get DID with did: ${args.did} and alias: ${args.alias}`,
      );
    }
  }

  async deleteDID({ did }: { did: string }): Promise<boolean> {
    const data = await this.loadData();
    delete data[did];
    this.saveData(data);
    return true;
  }

  async importDID(args: IIdentifier): Promise<boolean> {
    const data = await this.loadData();
    data[args.did] = args;
    await this.saveData(data);
    return true;
  }

  async listDIDs(_args: IIdentifier): Promise<IIdentifier[]> {
    const data = await this.loadData();
    return Object.values(data) as IIdentifier[];
  }

  private async loadData(): Promise<AdapterData['dids']> {
    if (!this.filesystem.exists(this.filePath)) {
      return {} ;
    }
    try {

      return JSON.parse(await this.filesystem.readFile(this.filePath));

    } catch(error: unknown) {

      this.logger?.error(`Error loading DID data: ${error instanceof Error ? error.message : String(error)}`);  
      return {} ;
    }
  }

 private async saveData(data: AdapterData['dids']) {
    try {
    
      this.logger?.info(`Save data triggered for file: ${this.filePath}`);

      await this.filesystem.writeFile(this.filePath, JSON.stringify(data, null, 2));
    } catch (error: unknown) {
      
      this.logger?.error(`Error saving DID data: ${error instanceof Error ? error.message : String(error)}`);
       throw new VError(
        { 
          name: "FileDIDStoreError", 
          cause: error instanceof Error ? error : undefined, 
        },
        `Failed to save DID data to file: ${this.filePath}`,
      );
    }
  }
}
