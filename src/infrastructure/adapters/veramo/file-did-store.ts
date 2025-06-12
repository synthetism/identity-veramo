import type { IIdentifier } from "@veramo/core";
import { AbstractDIDStore } from "@veramo/did-manager";

import fs from "node:fs";

// File-based DID store implementation
export class FileDIDStore extends AbstractDIDStore {
  private filePath: string;

  constructor(filePath: string) {
    super();
    this.filePath = filePath;
  }

  async getDID(args: { did: string; alias: string }): Promise<IIdentifier> {
    try {
      const data = this.loadData();
      return data.dids[args.did];
    } catch (error) {
      console.error("Error getting DID:", error);
      throw error;
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

  async listDIDs(args: IIdentifier): Promise<IIdentifier[]> {
    const data = this.loadData();
    return Object.values(data.dids) as IIdentifier[];
  }

  private loadData() {
    if (!fs.existsSync(this.filePath)) {
      return { dids: {} };
    }
    try {
      return JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
    } catch {
      return { dids: {} };
    }
  }

  private saveData(data: Record<string, IIdentifier>) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }
}
