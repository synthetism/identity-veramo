import type { IAsyncFileSystem } from "@synet/patterns/fs/promises";
import  { IdentityVault, type  IVaultStorage} from "@synet/vault-core";
import { VaultId } from "@synet/vault-core";
import type { Logger } from "@synet/logger";
import { Result } from "@synet/patterns";
import type { Mapper } from "@synet/patterns";
import path from "node:path";
import { Identity } from "@synet/identity-core";
import  VError  from "verror";



interface IdentityVaultModel {
    id: string;
    identity?: string; // Serialized Identity object
    didStore: string[]; // Array of DID identifiers
    keyStore: string[]; // Array of key identifiers
    privateKeyStore: string[]; // Array of private key identifiers
    vcStore: string[]; // Array of Verifiable Credential identifiers
    createdAt: string; // Creation date of the vault
}




export class FileVaultStorage implements IVaultStorage {
    private readonly vaultPath: string;

    constructor(
        private storeDir: string,
        private filesystem: IAsyncFileSystem,
        private logger? : Logger,

    ) {
        this.vaultPath = this.storeDir;

              
    }


     getPath(vaultId: string): string {

        const vaultFile =  path.join(this.vaultPath, `${vaultId}.json`);
        return vaultFile;   
    }

    async delete(vaultId: string): Promise<void> {

        const vaultFilePath = this.getPath(vaultId);

        // Check if vault exists
        if (! await this.filesystem.exists(vaultFilePath)) {
            throw new Error(`Vault with ID ${vaultId} does not exist.`);
        }

        // Delete the vault file
        await this.filesystem.deleteFile(vaultFilePath);
    }
    

    async create(vaultId:string, serializedData: string): Promise<void> {
       
        const vaultFilePath = this.getPath(vaultId);

        // Check if vault already exists
        if (await this.filesystem.exists(vaultFilePath)) {
            throw new Error(`Vault with ID ${vaultId} already exists`);
        }

        // Ensure the vault directory exists
        await this.filesystem.ensureDir(this.vaultPath);

        await this.filesystem.writeFile(vaultFilePath, serializedData);
        // Write the vault data to a file
                     
    }
    
    async get(vaultId: string): Promise<string> {

        try {
             const vaultFilePath = this.getPath(vaultId);

            // Check if vault exists
            if (!await this.filesystem.exists(vaultFilePath)) {
                throw new VError(`Vault with ID ${vaultId} does not exist.`);
            }

            //console.log(`Retrieving vault with ID ${vaultId} from path: ${vaultFilePath}`);

            const vaultJson = await this.filesystem.readFile(vaultFilePath);         
            return vaultJson;

          } catch (error) {

         
            this.logger?.error(`Error retrieving vault with ID ${vaultId}`);
            throw error;

          }   
    }
 
  // In FileVaultStorage.ts
  async update(vaultId: string, serializedData: string): Promise<void> {
  const filePath = this.getPath(vaultId);
  
  if (!await this.exists(vaultId)) {
    throw new Error(`Vault with ID ${vaultId} does not exist`);
  }
  
  try {
  

    // Write the file directly without lockfile for now to avoid async issues
    await this.filesystem.writeFile(filePath, serializedData);

    this.logger?.debug(`Updated vault ${vaultId} at ${filePath}`);

   } catch (error) {
    this.logger?.error(`Error updating vault ${vaultId}: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to update vault ${vaultId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
   async list(): Promise<string[]> {
    if (!await this.filesystem.exists(this.vaultPath)) {
      return [];
    }
    
    const files = await this.filesystem.readDir(this.vaultPath);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => path.basename(file, '.json'));  // Return just vault IDs
   }

    async exists(vaultId: string): Promise<boolean> {
        const vaultFilePath = this.getPath(vaultId);
        return this.filesystem.exists(vaultFilePath);
     }


 


 }

