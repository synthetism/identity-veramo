import type { IAsyncFileSystem } from "@synet/patterns/fs/promises";
import type { IdentityVault, IVaultStorage} from "@synet/vault-core";
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


export class VaultMapper implements Mapper<IdentityVault, IdentityVaultModel> {
  /**
   * Maps from database record to domain entity
   */
   toDomain(model: IdentityVaultModel): Result<IdentityVault> {

       const vaultIdResult = VaultId.create(model.id);
        if (!vaultIdResult.isSuccess) {
            throw new Error(`Invalid vault ID: ${vaultIdResult.errorMessage}`);
        }

        let identity: Identity | undefined;
        if (model.identity) {

            const data = JSON.parse(model.identity);
            console.log('Deserializing identity data:', data);
            
            // Check if it's already in the ValueObject format (with props)
            if (data) {
            

                const identityResult = Identity.create({
                    alias: data.alias,
                    did: data.did,
                    kid: data.kid,
                    publicKeyHex: data.publicKeyHex,
                    privateKeyHex: data.privateKeyHex,
                    provider: data.provider,
                    credential: data.credential,
                    metadata: data.metadata,
                    createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
                    version: data.version
                });
                
                if (!identityResult.isSuccess) {
                    throw new Error(`Failed to recreate Identity: ${identityResult.errorMessage}`);
                }
                identity = identityResult.value;
                
            }  else {

              throw new VError({
                name: 'InvalidIdentityError',
                cause: new Error(`Invalid identity data for vault ID ${model.id}`),
                info: {
                  vaultId: model.id,
                },
               }, `Vault with id ${model.id} data does not contain valid identity information.`);
           
            }            
        }

        return Result.success({
            id: vaultIdResult.value,
            identity,
            didStore: model.didStore ? model.didStore.map(did => JSON.parse(did)) : [],
            keyStore: model.keyStore ? model.keyStore.map(key => JSON.parse(key)) : [],
            privateKeyStore: model.privateKeyStore ? model.privateKeyStore.map(key => JSON.parse(key)) : [],
            vcStore: model.vcStore ? model.vcStore.map(vc => JSON.parse(vc)) : [],
            createdAt: new Date(model.createdAt),
        });
    }

   toPersistence(entity: IdentityVault): IdentityVaultModel {
           
          return {
              id: entity.id.toString(),
              identity: entity.identity ? JSON.stringify(entity.identity) : undefined,
              didStore: entity.didStore ? entity.didStore.map(did => did.toString()) : [],
              keyStore: entity.keyStore ? entity.keyStore.map(key => key.toString()) : [],
              privateKeyStore: entity.privateKeyStore ? entity.privateKeyStore.map(key => key.toString()) : [],
              vcStore: entity.vcStore ? entity.vcStore.map(vc => vc.toString()) : [],
              createdAt: new Date(entity.createdAt).toISOString(), // Convert date to string
          };
    }

}



export class FileVaultStorage implements IVaultStorage {
    private readonly vaultPath: string;
    private readonly mapper: VaultMapper;
    constructor(
        private storeDir: string,
        private filesystem: IAsyncFileSystem,
        private logger? : Logger,

    ) {
        this.vaultPath = this.storeDir;

        this.mapper = new VaultMapper();
              
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

        const vaultData = this.mapper.toPersistence(identityVault);
        
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
            
            const persistedData: IdentityVaultModel = JSON.parse(vaultJson);

            const result = this.mapper.toDomain(persistedData);

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
    const updatedVault: IdentityVault = {
      ...currentVault,
      ...vaultData,
      id: currentVault.id, // Preserve the original ID
    };

    const vault = this.mapper.toPersistence(updatedVault);
    console.log('currentVault:', vault);

    const serialized = JSON.stringify(vault, null, 2);

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

