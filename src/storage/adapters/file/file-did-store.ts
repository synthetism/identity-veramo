import type { IIdentifier } from "@veramo/core";
import { AbstractDIDStore } from "@veramo/did-manager";
import type { Logger } from "@synet/logger";
import fs from "node:fs";
import VError  from "verror";
// File-based DID store implementation
export class FileDIDStore extends AbstractDIDStore {

  constructor(
    private filePath: string,
    private logger?: Logger
  ) {
    super();
    
  }

  async getDID(args: { did: string; alias: string }): Promise<IIdentifier> {
    try {
      
      const data = this.loadData();
      return data.dids[args.did];

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
    delete data.dids[did];
    this.saveData(data);
    return true;
  }

  async importDID(args: IIdentifier): Promise<boolean> {
    const data = this.loadData();
    data.dids[args.did] = args;
    this.saveData(data);
    return true;
  }

  async listDIDs(_args: IIdentifier): Promise<IIdentifier[]> {
    const data = this.loadData();
    return Object.values(data.dids) as IIdentifier[];
  }

  private loadData() {
    if (!fs.existsSync(this.filePath)) {
      return { dids: {} };
    }
    try {
      
      return JSON.parse(fs.readFileSync(this.filePath, "utf-8"));

    } catch(error: unknown) {

      this.logger?.error(`Error loading DID data: ${error instanceof Error ? error.message : String(error)}`);  
          
      return { dids: {} };
    }
  }

 private saveData(data: Record<string, IIdentifier>) {
    try {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
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
