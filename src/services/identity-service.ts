import { Result } from "@synet/patterns";
import type { Logger } from "@synet/logger";
import type { IIdentifier, KeyMetadata, IKey, TKeyType, IIdentity } from "@synet/identity-core";
import { Identity } from "@synet/identity-core";
import type { SynetVerifiableCredential, IdentitySubject } from "@synet/credentials";
import { CredentialType } from "@synet/credentials";
import type { IVaultOperator } from "@synet/vault-core";
import { IdentityVault } from "@synet/vault-core";
import type { UseCases } from "../application/use-cases";

/**
 * Identity Service Options
 */
export interface IdentityServiceOptions {
  storeDir?: string;
  vaultOperator?: IVaultOperator; // Vault operator for managing vault operations
}

/**
 * Identity Service
 * Coordinates DID, Key, and VC services with vault-based storage through use-cases
 */
export class IdentityService {
  private vaultId: string;
  
  constructor(
    private useCases: UseCases,
    private vault: IVaultOperator,
    public readonly options: IdentityServiceOptions = {},
    public readonly logger?: Logger,
  ) {
    this.vaultId = '';
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

     
     const vaultResult = await this.vault.createNew(alias);

      if (!vaultResult.isSuccess) {
      return Result.fail(
        `Failed to create vault for identity: ${vaultResult.errorMessage}`,
        vaultResult.errorCause
      );
      }

      const vaultId = vaultResult.value.toString();
      
      const useResult = await this.vault.use(vaultId);
      if (!useResult.isSuccess) {
        return Result.fail(
          `Failed to use vault for identity: ${useResult.errorMessage}`,
          useResult.errorCause
        );
      }
      // Create a DID with the key
      const didResult = await this.useCases.did.commands.create({ vaultId });

      if (!didResult.isSuccess || !didResult.value || !didResult.value.controllerKeyId) {
        return Result.fail(
          `Failed to create DID: ${didResult.errorMessage}`,
          didResult.errorCause,
        );
      }

      const { did, controllerKeyId, provider } = didResult.value;

      const credentialSubject: IdentitySubject = {
        holder: {
          id: did,
          name: alias,
        },
        issuedBy: {
          id: did,
          name: alias,
        },
      };

      const vcResult = await this.useCases.credentials.commands.issue({
        subject: credentialSubject,
        credentialType: [CredentialType.Identity],           
        issuerDid: did,
      });

      if(!vcResult.isSuccess || !vcResult.value) {
        this.logger?.error(`Failed to issue identity credential: ${vcResult.errorMessage}`);  
        return Result.fail(
          `Failed to issue identity credential: ${vcResult.errorMessage}`,
          vcResult.errorCause,
        );
      } 

      const vc = vcResult.value;

      const keyResult = await this.useCases.key.queries.getKey(controllerKeyId);

      if (!keyResult.isSuccess || !keyResult.value) {
        this.logger?.error(`Failed to retrieve key for DID: ${keyResult.errorMessage}`);
        return Result.fail(
          `Failed to retrieve key for DID: ${keyResult.errorMessage}`,
          keyResult.errorCause,
        );
      }
  
      const { publicKeyHex, privateKeyHex, type } = keyResult.value;

     const params = {
        alias: alias,
        did: did,
        kid: controllerKeyId,
        publicKeyHex: publicKeyHex,
        privateKeyHex: privateKeyHex, // Optional, can be used for signing
        provider: provider,
        credential: vc,
      }

      const identityResult = Identity.create(params);

      if(!identityResult.isSuccess) {
        this.logger?.error(`Failed to create identity unit: ${identityResult.errorMessage}`);
        return Result.fail(
          `Failed to create identity unit: ${identityResult.errorMessage}`, 
          identityResult.errorCause,
        );
      }

      const vaultCreateResult = IdentityVault.create({
        id: vaultId,
        identity: identityResult.value,
        keyStore: [keyResult.value],
        didStore: [didResult.value],
        vcStore: [vc],
        privateKeyStore: [], 
        wgKeyStore: [], // Optional, can be managed separately
        createdAt: new Date(),
      });

      if(!vaultCreateResult.isSuccess) {
        this.logger?.error(`Failed to create vault entry: ${vaultCreateResult.errorMessage}`);
        return Result.fail(
          `Failed to create vault entry: ${vaultCreateResult.errorMessage}`,
          vaultCreateResult.errorCause,
        );
      }   

      const vaultEntry = vaultCreateResult.value;

      //console.log('vaultEntry:', vaultEntry);

      const updateResult = await this.vault.updateVault(vaultEntry);
      if (!updateResult.isSuccess) {
        return Result.fail(
          `Failed to update vault: ${updateResult.errorMessage}`,
          updateResult.errorCause
        );
      }
  
   
      this.logger?.info(
        `Successfully created identity "${alias}" with DID ${did}`,
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
      const entryResult = await this.vault.getVault(aliasOrDid);

      if (!entryResult.isSuccess || !entryResult.value) {
        return Result.fail(`Identity "${aliasOrDid}" not found`);
      }


      await this.vault.deleteVault(aliasOrDid);

  
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
  async listIdentities(): Promise<Result<IIdentity[]>> {

      const vaultsResult = await this.vault.listVaults();

      if (!vaultsResult.isSuccess) {
        this.logger?.error(`Failed to list identities: ${vaultsResult.errorMessage}`);
        return Result.fail(`Failed to list identities: ${vaultsResult.errorMessage}`, vaultsResult.errorCause);
      }

      const identities: IIdentity[] = [];
      const vaults = vaultsResult.value;
      for (const vault of vaults) {
          if (vault.identity) {

            const idResult = Identity.create(vault.identity)
              
            if(idResult.isSuccess && idResult.value) {
              identities.push(idResult.value.toDomain());
            }
          }
      }
   
      return Result.success(identities);
  }

  /**
   * Get a single identity by alias or DID
   */
  async getIdentity(alias: string): Promise<Result<Identity>> {
    try {
      if (!this.vault) {
         return Result.fail("Vault operator not configured");
      }

      this.logger?.debug(`Getting identity with alias or DID "${alias}"...`);
      const vaultResult = await this.vault.getVault(alias);
      
      if (!vaultResult.isSuccess || !vaultResult.value.identity) {
        this.logger?.warn(`Identity "${alias}" not found`);
        return Result.fail(`Identity "${alias}" not found`);
      }

      const identityResult = Identity.create(vaultResult.value.identity);

      if (!identityResult.isSuccess || !identityResult.value) {
        this.logger?.error(`Failed to get identity: ${identityResult.errorMessage}`);
        return Result.fail(
          `Failed to get identity: ${identityResult.errorMessage}`,
          identityResult.errorCause,
        );
      }

       const identity = identityResult.value;
      
       //console.log("getIdentity:", identity.toDomain());

      //console.log("retrieving identity:", identity.value);

      return Result.success(identity);

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
      const identityResult = await this.getIdentity(currentAlias);
      if (!identityResult.isSuccess || !identityResult.value) {
        return Result.fail(`Identity "${currentAlias}" not found`);
      }

      const identity = identityResult.value;

      // Update DID alias
      const didResult = await this.useCases.did.commands.update({
        did: identity.did,
        updates: { alias: newAlias }
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
  ): Promise<Result<{ identity: Identity;  keys: IKey[] }>> {
    try {
      this.logger?.debug(
        `Getting detailed information for identity "${aliasOrDid}"...`,
      );

      // Find the identity
      const vaultResult = await this.vault.getVault(aliasOrDid);
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