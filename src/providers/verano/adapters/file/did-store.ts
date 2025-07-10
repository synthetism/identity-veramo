import type { IIdentifier } from "@synet/identity-core";
import { AbstractDIDStore } from "@synet/vault-core";
import type { Logger } from "@synet/logger";
import VError  from "verror";
import type { AdapterData } from "@synet/vault-core";
import type { IFileSystem } from "@synet/fs";
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
      
      const data = this.loadData();
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
    const data = this.loadData();
    delete data[did];
    this.saveData(data);
    return true;
  }

  async importDID(args: IIdentifier): Promise<boolean> {
    const data = this.loadData();
    data[args.did] = args;
    this.saveData(data);
    return true;
  }

  async listDIDs(_args: IIdentifier): Promise<IIdentifier[]> {
    const data = this.loadData();
    return Object.values(data) as IIdentifier[];
  }

  private loadData(): AdapterData['dids'] {
    if (!this.filesystem.existsSync(this.filePath)) {
      return {} ;
    }
    try {

      return JSON.parse(this.filesystem.readFileSync(this.filePath));

    } catch(error: unknown) {

      this.logger?.error(`Error loading DID data: ${error instanceof Error ? error.message : String(error)}`);  
      return {} ;
    }
  }

 private saveData(data: AdapterData['dids']) {
    try {
    
      this.logger?.info(`Save data triggered for file: ${this.filePath}`);

      this.filesystem.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
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
