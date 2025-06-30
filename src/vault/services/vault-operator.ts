import type { Logger } from "@synet/logger";
import type { IVaultStorage, IVaultOperator } from "@synet/vault-core";
import { vaultEventService }  from "@synet/vault-core";

import { Result } from "@synet/patterns";
import type { IdentityVault } from "@synet/vault-core";
import { VaultId } from "../domain/value-objects/vault-id";
import type { VaultSynchronizer } from "./vault-synchronizer";
import type { IFileSystem } from "../../shared/filesystem/filesystem.interface";

export interface VaultOptions  { 
  storeDir?: string; // Directory to store vault data
}


export class VaultOperator implements IVaultOperator {

    constructor( 
        private vaultStorage: IVaultStorage,
        private synchronizer: VaultSynchronizer,
        private logger? : Logger,
    ) {

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
        const seedResult = await this.synchronizer.seedFilesFromVault(vaultId);
        if (seedResult.isFailure) {
            return Result.fail(`Failed to initialize vault: ${seedResult.errorMessage}`);
        }
        
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
  async createNew(id: string): Promise<Result<void>> {
    try {
      const vaultIdResult = VaultId.create(id);

      if (!vaultIdResult.isSuccess) {
        this.logger?.error(`Failed to create vault: ${vaultIdResult.errorMessage}`);
        return Result.fail(vaultIdResult.errorMessage || 'Failed to create vault due to unknown error');
      } 

      const vaultId = vaultIdResult.value.toString();
      
      // Check if vault already exists
      if (await this.vaultStorage.exists(vaultId)) {
        return Result.fail(`Vault with ID ${vaultId} already exists`);
      }
      
      // Create an empty vault structure
      const emptyVault: IdentityVault = {
        id: vaultIdResult.value,
        didStore: [],
        keyStore: [],
        privateKeyStore: [],
        vcStore: [],
        createdAt: new Date(),
      };
      
      await this.vaultStorage.create(vaultId, emptyVault);  
      
      this.logger?.info(`Created new vault: ${vaultId}`);
      return Result.success(undefined);
    } catch (error: unknown) {
      this.logger?.error(`Error creating vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return Result.fail(`Failed to create vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const vaultIdResult = VaultId.create(id);

      if (!vaultIdResult.isSuccess) {
        return Result.fail(vaultIdResult.errorMessage || 'Invalid vault ID');
      }

      const vaultId = vaultIdResult.value.toString();
      
      // Check if vault exists
      if (!await this.vaultStorage.exists(vaultId)) {
        return Result.fail(`Vault with ID ${vaultId} does not exist`);
      }
      
      // Get the vault
      const vault = await this.vaultStorage.get(vaultId);
      
      return Result.success(vault);
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
        const vaults = await this.vaultStorage.list();
        return Result.success(vaults);
        } catch (error: unknown) {
        this.logger?.error(`Error listing vaults: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return Result.fail(`Failed to list vaults: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}