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


    

    async create(vaultId:string, identityVault: IdentityVault): Promise<void> {

        const vaultData = identityVault.toJSON();

        const vaultFilePath = this.getPath(vaultId);

        // Check if vault already exists
        if (await this.filesystem.exists(vaultFilePath)) {
            throw new Error(`Vault with ID ${vaultId} already exists`);
        }

        // Ensure the vault directory exists
        await this.filesystem.ensureDir(this.vaultPath);

        await this.filesystem.writeFile(vaultFilePath, JSON.stringify(vaultData, null, 2));
        // Write the vault data to a file
                     
    }
    
    async get(vaultId: string): Promise<IdentityVault> {

        try {
             const vaultFilePath = this.getPath(vaultId);

            // Check if vault exists
            if (!await this.filesystem.exists(vaultFilePath)) {
                throw new VError(`Vault with ID ${vaultId} does not exist.`);
            }

            console.log(`Retrieving vault with ID ${vaultId} from path: ${vaultFilePath}`);

            const vaultJson = await this.filesystem.readFile(vaultFilePath);
            console.log(`Read vault JSON (length: ${vaultJson.length}):`, `${vaultJson.substring(0, 100)}...`);


            const result = IdentityVault.fromJSON(vaultJson);

            if( !result.isSuccess) {
                throw new VError({
                  name: 'InvalidVaultDataError',
                  cause: result.errorCause,
                  info: {
                    vaultId,               
                  },
                }, `Failed to convert vault data: ${result.errorMessage}`);
            }

            return result.value;

          } catch (error) {

         
            this.logger?.error(`Error retrieving vault with ID ${vaultId}`);
            throw error;

          }   
    }
 
  // In FileVaultStorage.ts
  async update(vaultId: string, vaultData: IdentityVault): Promise<void> {
  const filePath = this.getPath(vaultId);
  
  if (!await this.exists(vaultId)) {
    throw new Error(`Vault with ID ${vaultId} does not exist`);
  }
  
  try {
  
   const currentVault = await this.get(vaultId);
    const updatedVaultResult = IdentityVault.create({
      ...currentVault,
      ...vaultData,
      id: currentVault.id.toString(), // Preserve the original ID
    });

    if(updatedVaultResult.isFailure) {
      throw new VError({
        name: 'InvalidVaultDataError',
        cause: updatedVaultResult.errorCause,
        info: {
          vaultId,
        },
      }, `Failed to convert vault data: ${updatedVaultResult.errorMessage}`); 
    }

    const updatedVault = updatedVaultResult.value;

    console.log('currentVault:', currentVault);

    const serialized = JSON.stringify(currentVault, null, 2);

    this.logger?.debug(
      `Updating vault ${vaultId} with:` +
      ` ${updatedVault.didStore?.length || 0} DIDs,` +
      ` ${updatedVault.keyStore?.length || 0} keys,` +
      ` ${updatedVault.privateKeyStore?.length || 0} private keys,` +
      ` ${updatedVault.vcStore?.length || 0} VCs`
    );

    // Write the file directly without lockfile for now to avoid async issues
    await this.filesystem.writeFile(filePath, serialized);

    this.logger?.debug(`Updated vault ${vaultId} at ${filePath}`);

   } catch (error) {
    this.logger?.error(`Error updating vault ${vaultId}: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to update vault ${vaultId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
   async list(): Promise<IdentityVault[]> {

        const vaults: IdentityVault[] = [];
        const files = await this.filesystem.readDir(this.vaultPath);
        if (!files || files.length === 0) {
            return vaults; // Return empty array if no files found
        }
        for (const file of files) {
            if (file.endsWith('.json')) {
            const vaultId = path.basename(file, '.json');
            const vaultData = await this.get(vaultId);
            vaults.push(vaultData);
            }
        }

        return vaults;
    }

    async exists(vaultId: string): Promise<boolean> {
        const vaultFilePath = this.getPath(vaultId);
        return this.filesystem.exists(vaultFilePath);
     }


 


 }

