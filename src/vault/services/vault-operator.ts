import type { Logger } from "@synet/logger";
import type { IVaultStorage, IVaultOperator } from "@synet/vault-core";
import { vaultEventService, vaultContext }  from "@synet/vault-core";

import { Result } from "@synet/patterns";
import { IdentityVault } from "@synet/vault-core";
import { VaultId } from "../domain/value-objects/vault-id";
import type { VaultSynchronizer } from "./vault-synchronizer";
import type { IFileSystem } from "../../shared/filesystem/filesystem.interface";


export class VaultOperator implements IVaultOperator {  
  private vaultId: string | null = null; 
  
  constructor( 
        private vaultStorage: IVaultStorage,
        private synchronizer: VaultSynchronizer,
        private logger? : Logger,
    ) {
        this.vaultId = vaultContext.activeVaultId;
    }

   getCurrentVaultId(): string | null {
        return vaultContext.activeVaultId;
    }   

   async exists (vaultId: string): Promise<Result<boolean>> {
      try {
          const vaultExists = await this.vaultStorage.exists(vaultId);  
          if (vaultExists) {
              return Result.success(true);
          } 
          
          return Result.fail(`Vault with ID ${vaultId} does not exist`);
        
      } catch (error: unknown) {  
          this.logger?.error(`Error checking vault existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return Result.fail(`Failed to check vault existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
   } 
 async use(vaultId: string): Promise<Result<void>> {
      try {
          // Check if vault exists
        if (!await this.vaultStorage.exists(vaultId)) {
            return Result.fail(`Vault with ID ${vaultId} does not exist.`);
        }

        this.logger?.warn(`Using vault: ${vaultId}`);
    
        // Set active vault in the event service first
        vaultEventService.setActiveVault(vaultId);        
        this.synchronizer.setActiveVault(vaultId);
              
        // Seed files if needed (can be improved - synchronizer could listen for vault changes)
       /*  const seedResult = await this.synchronizer.seedFilesFromVault(vaultId);
        if (seedResult.isFailure) {
            return Result.fail(`Failed to initialize vault: ${seedResult.errorMessage}`);
        } */
        
        this.logger?.info(`Now using vault: ${vaultId}`);
        return Result.success(undefined);

      } catch (error: unknown) {
          this.logger?.error(`Error using vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return Result.fail(`Failed to use vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
  }
   
    /**
   * Create a new vault
   */
  async createNew(id: string): Promise<Result<VaultId>> {
    try {

      const vaultResult = IdentityVault.createNew({ id });
    

      if (!vaultResult.isSuccess) {
        this.logger?.error(`Failed to create vault: ${vaultResult.errorMessage}`);
        return Result.fail(vaultResult.errorMessage || 'Failed to create vault due to unknown error');
      } 

      const vault = vaultResult.value;
      const vaultId = vault.id.toString();

       const vaultData =  JSON.stringify(vault.toJSON(), null, 2); // Convert to JSON string with pretty print

      await this.vaultStorage.create(id, vaultData);  

      this.logger?.info(`Created new vault: ${vaultId}`);
      return Result.success(vault.id);

    } catch (error: unknown) {
      this.logger?.error(`Error creating vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return Result.fail(`Failed to create vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateVault(vault: IdentityVault): Promise<Result<void>> {
    try {

      const vaultId = vault.id.toString();
      const serializedData = JSON.stringify(vault.toJSON(), null, 2);

      await this.vaultStorage.update(vaultId, serializedData);
      this.logger?.info(`Updated vault: ${vaultId}`);
      return Result.success(undefined);
    } catch (error: unknown) {
      this.logger?.error(`Error updating vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return Result.fail(`Failed to update vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a vault
   */
  async deleteVault(id: string): Promise<Result<void>> {
    try {
      const vaultIdResult = VaultId.create(id);

      if (!vaultIdResult.isSuccess) {
        return Result.fail(vaultIdResult.errorMessage || 'Invalid vault ID');
      }

      const vaultId = vaultIdResult.value.toString();
      
      // Check if vault exists
      if (!await this.vaultStorage.exists(vaultId)) {
        return Result.fail(`Vault with ID ${vaultId} does not exist`);
      }
      
      // Delete the vault
      await this.vaultStorage.delete(vaultId);
      
      this.logger?.info(`Deleted vault: ${vaultId}`);
      return Result.success(undefined);
    } catch (error: unknown) {
      this.logger?.error(`Error deleting vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return Result.fail(`Failed to delete vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
   
  /**
   * Get a vault by ID
   */
  async getVault(id: string): Promise<Result<IdentityVault>> {
    try {
     
      
      // Get the vault
      const serializedData = await this.vaultStorage.get(id);
      
       const vaultResult = IdentityVault.fromJSON(serializedData);
      
       if (!vaultResult.isSuccess) {
        return Result.fail(`Failed to deserialize vault: ${vaultResult.errorMessage}`);
       }
       return Result.success(vaultResult.value);

    } catch (error: unknown) {
      this.logger?.error(`Error getting vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return Result.fail(`Failed to get vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

        /**
     * List all vaults
     */
    async listVaults(): Promise<Result<IdentityVault[]>> {
    try {

      const vaultIds = await this.vaultStorage.list();
      const vaults: IdentityVault[] = [];
      
      for (const vaultId of vaultIds) {
        const vaultResult = await this.getVault(vaultId);
        if (vaultResult.isSuccess) {
          vaults.push(vaultResult.value);
        }
      }
      
      return Result.success(vaults);
    } catch (error) {
      return Result.fail(`Failed to list vaults: ${error}`);
    }
  }
}