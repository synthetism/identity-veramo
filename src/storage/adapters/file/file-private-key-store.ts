import {
  AbstractPrivateKeyStore,
  type ManagedPrivateKey,
  type ImportablePrivateKey,
} from "@veramo/key-manager";
import fs from "node:fs";
import crypto from "node:crypto";
import VError  from "verror";
import type { Logger } from "@synet/logger";
// File-based private key store implementation
export class FilePrivateKeyStore extends AbstractPrivateKeyStore {


  constructor(
    private readonly filePath: string,
    private readonly logger?: Logger,
  ) {
    super();

  }

  async getKey({ alias }: { alias: string }): Promise<ManagedPrivateKey> {
    const data = this.loadData();
    return data.keys[alias];
  }

  async deleteKey({ alias }: { alias: string }): Promise<boolean> {
    const data = this.loadData();
    this.logger?.info(`Attempting to delete key with alias: ${alias}`);

    // First, try direct match
    if (data.keys[alias]) {
      delete data.keys[alias];
      this.saveData(data);
      this.logger?.info(`Successfully deleted key with alias: ${alias}`);
      return true;
    }

    // If direct match fails, try to find keys whose privateKeyHex contains the alias
    // This handles the case where the alias is part of the key material

    const keys = Object.entries(data.keys);
    for (const [keyAlias, key] of keys) {
      if (key.privateKeyHex.includes(alias)) {
        this.logger?.info(
          `Found key ${keyAlias} containing ${alias} in its material`,
        );
        delete data.keys[keyAlias];
        this.saveData(data);
        this.logger?.debug(`Successfully deleted key with alias: ${keyAlias}`);
        return true;
      }
    }

    this.logger?.debug(`No key found with alias: ${alias}`);
    return false;
  }

  async importKey(
    privateKey: ImportablePrivateKey,
  ): Promise<ManagedPrivateKey> {
    try {
      const alias =
        privateKey.alias ||
        privateKey.type ||
        this.generateKeyAlias(privateKey);

      const managedKey: ManagedPrivateKey = {
        ...privateKey,
        alias: alias,
      };

      const data = this.loadData();
      data.keys[alias] = managedKey;
      this.saveData(data);

      return managedKey;
    } catch (error: unknown) {
      console.error("Error importing private key:", error);
      throw error;
    }
  }

  /**
   * Generate a consistent alias from a private key
   * This ensures the same key always gets the same alias
   */
  private generateKeyAlias(key: ImportablePrivateKey): string {
    if (key.type === "Ed25519") {
      // Ed25519 keys are 64 bytes (128 hex chars)
      const privateKeyHex = key.privateKeyHex;
      if (privateKeyHex.length >= 64) {
        // Extract the second half (public key portion)
        return privateKeyHex.slice(privateKeyHex.length / 2);
      }
    }

    // Fallback for other key types
    const prefix = key.type?.toLowerCase() || "key";
    const hash = crypto
      .createHash("sha256")
      .update(key.privateKeyHex)
      .digest("hex")
      .substring(0, 8);

    return `${prefix}-${hash}`;
  }

  async listKeys(): Promise<Array<ManagedPrivateKey>> {
    const data = this.loadData();
    return Object.values(data.keys);
  }

  private loadData(): { keys: Record<string, ManagedPrivateKey> } {
    if (!fs.existsSync(this.filePath)) {
      return { keys: {} };
    }
    try {
      const content = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      return content || { keys: {} };
    } catch {
      return { keys: {} };
    }
  }

 
    private saveData(data: { keys: Record<string, ManagedPrivateKey> }) {
 
     try {
         fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
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
