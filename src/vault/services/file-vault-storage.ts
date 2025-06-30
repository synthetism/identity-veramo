import type { IFileSystem } from "../../shared/filesystem/promises/filesystem.interface";
import type { IdentityVault, IVaultStorage} from "@synet/vault-core";
import type { Logger } from "@synet/logger";
import lockfile from 'proper-lockfile';  // You'll n
import path from "node:path";

interface IdentityModel {
    id: string;
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
        private filesystem: IFileSystem,
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

        const vaultData = this.toPersistence(identityVault);
        
        const vaultFilePath = this.getPath(vaultId);

        // Check if vault already exists
        if (await this.filesystem.exists(vaultFilePath)) {
            throw new Error(`Vault with ID ${vaultId} already exists`);
        }

        await this.filesystem.writeFile(vaultFilePath, JSON.stringify(vaultData, null, 2));
        // Write the vault data to a file
                     
    }
    
    async get(vaultId: string): Promise<IdentityVault> {

        try {
             const vaultFilePath = this.getPath(vaultId);

            // Check if vault exists
            if (!await this.filesystem.exists(vaultFilePath)) {
                throw new Error(`Vault with ID ${vaultId} does not exist.`);
            }

            //console.log(`Retrieving vault with ID ${vaultId} from path: ${vaultFilePath}`);

            const vaultJson = await this.filesystem.readFile(vaultFilePath);
            return JSON.parse(vaultJson);

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
    // Ensure we have all the required properties

    
    // Log what we're updating
   
    /* const serialized = JSON.stringify(updatedVault, null, 2);
    await this.filesystem.writeFile(filePath, serialized);

    await lockfile.unlock(filePath); */

     /*   this.logger?.debug(
        `Updating vault ${vaultId} with:` +
        ` ${updatedVault.didStore?.length || 0} DIDs,` +
        ` ${updatedVault.keyStore?.length || 0} keys,` +
        ` ${updatedVault.privateKeyStore?.length || 0} private keys,` +
        ` ${updatedVault.vcStore?.length || 0} VCs`
      ); */

    
      const currentVault = await this.get(vaultId);
      const updatedVault: IdentityVault = {
        ...currentVault,
        ...vaultData,
        id: currentVault.id, // Preserve the original ID
      };

     const vault = this.toPersistence(updatedVault);
      console.log('currentVault:',vault);

    const serialized = JSON.stringify(updatedVault, null, 2);
     // await this.filesystem.writeFile(filePath, serialized);

     // this.logger?.debug(`Updated vault ${vaultId} at ${filePath}`);

   lockfile.lock(filePath,{
      retries: 10,
      stale: 10000, // 10 seconds
    })
    .then((release) => {
    
        this.logger?.debug(
        `Updating vault ${vaultId} with:` +
        ` ${updatedVault.didStore?.length || 0} DIDs,` +
        ` ${updatedVault.keyStore?.length || 0} keys,` +
        ` ${updatedVault.privateKeyStore?.length || 0} private keys,` +
        ` ${updatedVault.vcStore?.length || 0} VCs`
      );

        //const serialized = JSON.stringify(updatedVault, null, 2);
        this.filesystem.writeFile(filePath, serialized);

        this.logger?.debug(`Updated vault ${vaultId} at ${filePath}`);
        return release();

    }).catch((e) => {
    // either lock could not be acquired
    // or releasing it failed
        console.error(e)
    })  


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


   toPersistence(entity: IdentityVault): IdentityModel {
           
          return {
              id: entity.id.toString(),
              didStore: entity.didStore ? entity.didStore.map(did => did.toString()) : [],
              keyStore: entity.keyStore ? entity.keyStore.map(key => key.toString()) : [],
              privateKeyStore: entity.privateKeyStore ? entity.privateKeyStore.map(key => key.toString()) : [],
              vcStore: entity.vcStore ? entity.vcStore.map(vc => vc.toString()) : [],
              createdAt: new Date(entity.createdAt).toISOString(), // Convert date to string
          };
    }
 }

