import {
  AbstractPrivateKeyStore
} from "@synet/vault-core"
import crypto from "node:crypto";
import VError  from "verror";
import type { ManagedPrivateKey, ImportablePrivateKey  } from "@synet/identity-core";
import type { Logger } from "@synet/logger";
import type { IFileSystem } from "@synet/patterns/fs";
import type { AdapterData } from "@synet/vault-core";

// File-based private key store implementation
export class PrivateKeyStore extends AbstractPrivateKeyStore {


  constructor(
    private readonly filesystem: IFileSystem,
    private readonly filePath: string,
    private readonly logger?: Logger,
  ) {
    super();

  }

  async getKey({ alias }: { alias: string }): Promise<ManagedPrivateKey> {
    const data = this.loadData();
    return data[alias];
  }

  async deleteKey({ alias }: { alias: string }): Promise<boolean> {
    const data = this.loadData();
    this.logger?.info(`Attempting to delete key with alias: ${alias}`);

    // First, try direct match
    if (data[alias]) {
      delete data[alias];
      this.saveData(data);
      this.logger?.info(`Successfully deleted key with alias: ${alias}`);
      return true;
    }

    // If direct match fails, try to find keys whose privateKeyHex contains the alias
    // This handles the case where the alias is part of the key material

    const keys = Object.entries(data);
    for (const [keyAlias, key] of keys) {
      if (key.privateKeyHex.includes(alias)) {
        this.logger?.info(
          `Found key ${keyAlias} containing ${alias} in its material`,
        );
        delete data[keyAlias];
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
      data[alias] = managedKey;
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
    return Object.values(data);
  }

  private loadData(): AdapterData['privateKeys']  {
    if (!this.filesystem.existsSync(this.filePath)) {
      return {};
    }
    try {
      const content = JSON.parse(this.filesystem.readFileSync(this.filePath));
      return content || {};
    } catch {
      return {}
    }
  }

  private saveData(data:  AdapterData['privateKeys'] ) {

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
