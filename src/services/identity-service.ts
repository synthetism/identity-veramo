import { Result } from "@synet/patterns";
import type { Logger } from "@synet/logger";
import type { IDidService } from "./did-service";
import type { IKeyService } from "./key-service";
import type { IFileIndexer } from "../storage/indexer/file-indexer.interface";
import type { IndexEntry } from "../storage/indexer/types";
import type { IIdentifier, KeyMetadata, IKey, TKeyType } from "@veramo/core";
import type { IVCService } from "./vc-service";
import type { SynetVerifiableCredential,IdentitySubject, AuthorizationSubject } from "@synet/credentials";
import { CredentialType  } from "@synet/credentials";

/**
 * Identity Service Options
 */
export interface IdentityServiceOptions {
  storeDir?: string;
  defaultIssuerDid?: string; // Default DID to use if none provided
}

/**
 * Identity Service
 * Coordinates DID, Key, and Index for managing identities
 */
export class IdentityService {
  constructor(
    private didService: IDidService,
    private keyService: IKeyService,
    private vcService: IVCService, // Assuming vcService is defined elsewhere
    private indexer: IFileIndexer, // Now just using the indexer
    public readonly options: IdentityServiceOptions = {},
    public readonly logger?: Logger,
  ) {}

  /**
   * Create a complete identity with DID and keys
   */
  async createIdentity(
    alias: string,
    meta?: KeyMetadata,
  ): Promise<Result<IndexEntry>> {
    try {
      this.logger?.debug(`Creating identity with alias "${alias}"...`);

      // First, validate alias is available
      if (this.indexer.aliasExists(alias)) {
        return Result.fail(`Identity with alias "${alias}" already exists`);
      }
  
   
      // 2. Create a DID with the key
      const didResult = await this.didService.create(alias);

      if (!didResult.isSuccess || !didResult.value) {
        // Clean up the key if DID creation fails
        //await this.keyStore.delete(key.kid);
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


      // 3. Create and index the identity entry
      const entry: IndexEntry = {
        alias,
        did: did.did,
        kid: did.controllerKeyId || "",
        description: meta?.description || "",
        createdAt: new Date().toISOString(),
        meta: {
          ...meta,
        },
        source: "local",
      };

      this.indexer.create(entry);

      this.logger?.debug(
        `Successfully created identity "${alias}" with DID ${did.did}`,
      );
      return Result.success(entry);
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

      // 1. Find the identity
      const entryResult = this.getIdentity(aliasOrDid);

      if (!entryResult.isSuccess || !entryResult.value) {
        return Result.fail(`Identity "${aliasOrDid}" not found`);
      }

      const entry = entryResult.value;

      // 2. Delete DID
      const didResult = await this.didService.delete(entry.did);
      if (!didResult.isSuccess) {
        this.logger?.error(
          `Failed to delete DID ${entry.did}: ${didResult.errorMessage}`,
        );
        // Continue with deletion attempts even if DID deletion fails
      }

      // 3. Delete key
      const keyResult = await this.keyService.delete(entry.kid);
      if (!keyResult.isSuccess) {
        this.logger?.error(
          `Failed to delete key ${entry.kid}: ${keyResult.errorMessage}`,
        );
        // Continue with deletion attempts even if key deletion fails
      }

      // 4. Delete index entry
      this.indexer.delete(entry.alias);

      this.logger?.info(`Successfully deleted identity "${entry.alias}"`);

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
  listIdentities(): Result<IndexEntry[]> {
    try {
      const entries = this.indexer.list();
      return Result.success(entries);
    } catch (error) {
      this.logger?.error(`Failed to list identities: ${error}`);
      return Result.fail(
        `Failed to list identities: ${error}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Get a single identity by alias or DID
   */
  getIdentity(aliasOrDid: string): Result<IndexEntry | null> {
    try {
      this.logger?.debug(`Getting identity with alias or DID "${aliasOrDid}"...`);
      const entry = this.indexer.get(aliasOrDid);
      return Result.success(entry);
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
  ): Promise<Result<IndexEntry>> {
    try {
      this.logger?.debug(
        `Renaming identity from "${currentAlias}" to "${newAlias}"...`,
      );

      // 1. Verify current identity exists
      const entryResult = this.getIdentity(currentAlias);
      if (!entryResult.isSuccess || !entryResult.value) {
        return Result.fail(`Identity "${currentAlias}" not found`);
      }

      // 2. Verify new alias is available
      if (this.indexer.aliasExists(newAlias)) {
        return Result.fail(`Identity with alias "${newAlias}" already exists`);
      }

      const entry = entryResult.value;

      // 3. Update DID alias
      const didResult = await this.didService.update(entry.did, {
        alias: newAlias,
      });
      if (!didResult.isSuccess) {
        return Result.fail(
          `Failed to update DID alias: ${didResult.errorMessage}`,
        );
      }

      // 5. Remove old index entry
      this.indexer.delete(currentAlias);

      // 6. Create new index entry with updated alias
      const newEntry: IndexEntry = {
        ...entry,
        alias: newAlias,
        meta: {
          ...entry.meta,
          name: newAlias,
        },
      };
      this.indexer.create(newEntry);

      this.logger?.info(
        `Successfully renamed identity from "${currentAlias}" to "${newAlias}"`,
      );
      return Result.success(newEntry);
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
  ): Promise<Result<{ entry: IndexEntry; did: IIdentifier; keys: IKey[] }>> {
    try {
      this.logger?.debug(
        `Getting detailed information for identity "${aliasOrDid}"...`,
      );

      // 1. Find the identity
      const entryResult = this.getIdentity(aliasOrDid);
      if (!entryResult.isSuccess || !entryResult.value) {
        return Result.fail(`Identity "${aliasOrDid}" not found`);
      }

      const entry = entryResult.value;

      // 2. Get DID document
      const didResult = await this.didService.get(entry.did);
      if (!didResult.isSuccess) {
        return Result.fail(
          `Failed to get DID document: ${didResult.errorMessage}`,
        );
      }

      const didDoc = didResult.value;

      // 3. Get associated keys
      const keys = [];

      const keyPromises = didDoc.keys.map((k) => this.keyService.get(k.kid));

      const keyResults = await Promise.all(keyPromises);
      for (const result of keyResults) {
        if (result.isSuccess) {
          keys.push(result.value);
        }
      }

      // 4. Construct detailed response
      const details = {
        entry,
        did: didResult.value,
        keys,
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
   * @param didOrAlias DID or alias
   * @param keyType Optional key type (e.g. 'rsa', 'ed25519')
   * @returns Result with public key object
   * @returns kid - Key ID
   * @returns publicKeyHex - Public key in hex format
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
