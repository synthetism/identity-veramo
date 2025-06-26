import { Result } from "@synet/patterns";
import type { Logger } from "@synet/logger";
import type { IDidService } from "./did-service";
import type { IKeyService } from "./key-service";
import type { IFileIndexer } from "../storage/indexer/file-indexer.interface";
import type { IndexEntry } from "../storage/indexer/types";
import type { IIdentifier, KeyMetadata, IKey, TKeyType } from "@veramo/core";
import type { IVCService } from "./vc-service";
import type { SynetVerifiableCredential, IdentitySubject, AuthorizationSubject } from "@synet/credentials";
import { CredentialType } from "@synet/credentials";
import type { IdentityFile, IdentityVault, VaultOperator } from "@synet/vault";

/**
 * Identity Service Options
 */
export interface IdentityServiceOptions {
  storeDir?: string;
  defaultIssuerDid?: string; // Default DID to use if none provided
  vaultOperator?: VaultOperator; // Vault operator for managing vault operations
}

/**
 * Identity Service
 * Coordinates DID, Key, and VC services with vault-based storage
 */
export class IdentityService {
  private vaultId:string;
  constructor(
    private didService: IDidService,
    private keyService: IKeyService,
    private vcService: IVCService,
    public readonly options: IdentityServiceOptions = {},
    public readonly logger?: Logger,
  ) {

    this.vaultId = '';

  }

  /**
   * Use a specific vault for identity operations
   */
  async useVault(alias: string): Promise<Result<void>> {
    if (!this.options.vaultOperator) {
      return Result.fail("Vault operator not configured");
    }

    const result = await this.options.vaultOperator.use(alias);
    if (!result.isSuccess) {
      this.logger?.error(`Failed to use vault ${alias}: ${result.errorMessage}`);
      return Result.fail(`Failed to use vault ${alias}: ${result.errorMessage}`, result.errorCause);
    }

    this.logger?.info(`Now using vault: ${alias}`);
    return Result.success(undefined);
  }

  /**
   * Create a new vault
   */
  async createVault(alias: string): Promise<Result<void>> {
    if (!this.options.vaultOperator) {
      return Result.fail("Vault operator not configured");
    }

    const result = await this.options.vaultOperator.createNew(alias);
    if (!result.isSuccess) {
      this.logger?.error(`Failed to create vault ${alias}: ${result.errorMessage}`);
      return Result.fail(`Failed to create vault ${alias}: ${result.errorMessage}`, result.errorCause);
    }

    this.logger?.info(`Created new vault: ${alias}`);
    return Result.success(undefined);
  }

  /**
   * Delete a vault
   */
  async deleteVault(alias: string): Promise<Result<void>> {
    if (!this.options.vaultOperator) {
      return Result.fail("Vault operator not configured");
    }

    const result = await this.options.vaultOperator.deleteVault(alias);
    if (!result.isSuccess) {
      this.logger?.error(`Failed to delete vault ${alias}: ${result.errorMessage}`);
      return Result.fail(`Failed to delete vault ${alias}: ${result.errorMessage}`, result.errorCause);
    }

    this.logger?.info(`Deleted vault: ${alias}`);
    return Result.success(undefined);
  }

  async listVaults(): Promise<Result<IdentityVault[]>> {
    if (!this.options.vaultOperator) {
      return Result.fail("Vault operator not configured");
    } 
    try {
      const vaultsResult = await this.options.vaultOperator.listVaults();

      if(!vaultsResult.isSuccess) {
        this.logger?.error(`Failed to list vaults: ${vaultsResult.errorMessage}`);
        return Result.fail(`Failed to list vaults: ${vaultsResult.errorMessage}`, vaultsResult.errorCause);
      }

      const vaults = vaultsResult.value;

      this.logger?.info(`Available vaults: ${vaults.join(", ")}`);
      return Result.success(vaults);

    } catch (error) {
      this.logger?.error(`Failed to list vaults: ${error}`);
      return Result.fail(
        `Failed to list vaults: ${error}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  async getVault(alias: string): Promise<Result<IdentityVault>> {
    if (!this.options.vaultOperator) {
      return Result.fail("Vault operator not configured");
    }
    try {
      this.logger?.debug(`Getting vault for identity "${alias}"...`);
      const vaultResult = await this.options.vaultOperator.getVault(alias);

      if (!vaultResult.isSuccess || !vaultResult.value) {
        this.logger?.warn(`Vault "${alias}" not found`);
        return Result.fail(`Vault "${alias}" not found`);
      }

      return Result.success(vaultResult.value);
    } catch (error) {
      this.logger?.error(`Failed to get vault: ${error}`);
      return Result.fail(
        `Failed to get vault: ${error}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
  /**
   * Create a complete identity with DID and keys
   */
  async createIdentity(
    alias: string,
    meta?: KeyMetadata,
  ): Promise<Result<void>> {
    try {
      this.logger?.debug(`Creating identity with alias "${alias}"...`);

     const vaultResult = await this.createVault(alias);
      if (!vaultResult.isSuccess) {
      return Result.fail(
        `Failed to create vault for identity: ${vaultResult.errorMessage}`,
        vaultResult.errorCause
      );
      }

      const useResult = await this.useVault(alias);
      if (!useResult.isSuccess) {
        return Result.fail(
          `Failed to use vault for identity: ${useResult.errorMessage}`,
          useResult.errorCause
        );
      }
      // Create a DID with the key
      const didResult = await this.didService.create(alias);

      if (!didResult.isSuccess || !didResult.value) {
        return Result.fail(
          `Failed to create DID: ${didResult.errorMessage}`,
          didResult.errorCause,
        );
      }

      const did = didResult.value;

      const credentialSubject: IdentitySubject = {
        holder: {
          id: did.did,
          name: alias,
        },
        issuedBy: {
          id: did.did,
          name: alias,
        },
      };

      const vcResult = await this.vcService.issueVC<IdentitySubject>(
        credentialSubject,
        [CredentialType.Identity],           
        did.did,
      );

      if (!vcResult.isSuccess) {
        this.logger?.warn(`Failed to issue identity credential: ${vcResult.errorMessage}`);
        // Continue with identity creation even if VC issuance fails
      }

      this.useVault(alias);
      
      this.logger?.debug(
        `Successfully created identity "${alias}" with DID ${did.did}`,
      );
      return Result.success(undefined);
    } catch (error) {
      this.logger?.error(`Failed to create identity: ${error}`);
      return Result.fail(
        `Failed to create identity: ${error}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Delete an identity completely (DID, keys, and index entry)
   */
  async deleteIdentity(aliasOrDid: string): Promise<Result<void>> {
    try {
      this.logger?.debug(`Deleting identity with alias or DID "${aliasOrDid}"...`);

      // Find the identity
      const entryResult = await this.getVault(aliasOrDid);

      if (!entryResult.isSuccess || !entryResult.value) {
        return Result.fail(`Identity "${aliasOrDid}" not found`);
      }


      this.deleteVault(aliasOrDid);

  
      this.logger?.info(`Successfully deleted identity "${aliasOrDid}"`);

      return Result.success(undefined);
    } catch (error) {
      this.logger?.error(`Failed to delete identity: ${error}`);
      return Result.fail(
        `Failed to delete identity: ${error}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * List all identities
   */
  async listIdentities(): Promise<Result<IdentityFile[]>> {

      const vaultsResult = await this.listVaults();

      if (!vaultsResult.isSuccess) {
        this.logger?.error(`Failed to list identities: ${vaultsResult.errorMessage}`);
        return Result.fail(`Failed to list identities: ${vaultsResult.errorMessage}`, vaultsResult.errorCause);
      }

      const identities: IdentityFile[] = [];
      const vaults = vaultsResult.value;
      for (const vault of vaults) {
          if (vault.identity) {
            identities.push(vault.identity);
          }
      }
   
      return Result.success(identities);
  }

  /**
   * Get a single identity by alias or DID
   */
  async getIdentity(aliasOrDid: string): Promise<Result<IdentityFile>> {
    try {
      if (!this.options.vaultOperator) {
         return Result.fail("Vault operator not configured");
      }

      this.logger?.debug(`Getting identity with alias or DID "${aliasOrDid}"...`);
      const identityResult = await this.options.vaultOperator.getVault(aliasOrDid);
      
      if (!identityResult.isSuccess || !identityResult.value.identity) {
        this.logger?.warn(`Identity "${aliasOrDid}" not found`);
        return Result.fail(`Identity "${aliasOrDid}" not found`);
      }
      
      return Result.success(identityResult.value.identity);

    } catch (error) {
      this.logger?.error(`Failed to get identity: ${error}`);
      return Result.fail(
        `Failed to get identity: ${error}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Update an identity's alias
   */
  async renameIdentity(
    currentAlias: string,
    newAlias: string,
  ): Promise<Result<void>> {
    try {
      this.logger?.debug(
        `Renaming identity from "${currentAlias}" to "${newAlias}"...`,
      );

      // Verify current identity exists
      const entryResult = await this.getIdentity(currentAlias);
      if (!entryResult.isSuccess || !entryResult.value) {
        return Result.fail(`Identity "${currentAlias}" not found`);
      }

      const entry = entryResult.value;

      // Update DID alias
      const didResult = await this.didService.update(entry.did, {
        alias: newAlias,
      });
      if (!didResult.isSuccess) {
        return Result.fail(
          `Failed to update DID alias: ${didResult.errorMessage}`,
        );
      }

   

      this.logger?.info(
        `Successfully renamed identity from "${currentAlias}" to "${newAlias}"`,
      );
      return Result.success(undefined);
    } catch (error) {
      this.logger?.error(`Failed to rename identity: ${error}`);
      return Result.fail(
        `Failed to rename identity: ${error}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Get detailed information about an identity including DID document
   */
  async getIdentityDetails(
    aliasOrDid: string,
  ): Promise<Result<{ identity: IdentityFile;  keys: IKey[] }>> {
    try {
      this.logger?.debug(
        `Getting detailed information for identity "${aliasOrDid}"...`,
      );

      // Find the identity
      const vaultResult = await this.getVault(aliasOrDid);
      if (!vaultResult.isSuccess || !vaultResult.value || !vaultResult.value.identity) {
        return Result.fail(`Identity "${aliasOrDid}" not found`);
      }

      const identity = vaultResult.value.identity;

      const keys = vaultResult.value.keyStore || [];

      // Construct detailed response
      const details = {
        identity: identity,
        keys: keys,
      };

      return Result.success(details);
      
    } catch (error) {
      this.logger?.error(`Failed to get identity details: ${error}`);
      return Result.fail(
        `Failed to get identity details: ${error}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Get only the public key for a DID
   */
  async getPublicKey(
    didOrAlias: string,
    keyType?: TKeyType | "Ed25519",
  ): Promise<Result<IKey | null>> {
    try {
      // Get the identity details
      const result = await this.getIdentityDetails(didOrAlias);
      if (!result.isSuccess || !result.value) {
        return Result.fail(
          result.errorMessage || "Identity not found",
          result.errorCause,
        );
      }

      // Find the specific key
      const identity = result.value;
      const keys = identity.keys;

      // If keyType is specified, find that specific key
      if (keyType) {
        const matchingKey = keys.find(
          (key) => key.type.toLowerCase() === keyType.toLowerCase(),
        );
        return Result.success(matchingKey || null);
      }

      // Otherwise return the first available key
      return Result.success(keys.length > 0 ? keys[0] : null);
    } catch (error) {
      return Result.fail(`Error getting public key: ${error}`);
    }
  }
}