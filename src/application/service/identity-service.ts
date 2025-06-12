import { Result } from "@synet/patterns";
import type { Logger } from "@synet/logger";
import type { IDidStore } from "../../infrastructure/stores/did-store";
import type { IKeyStore } from "../../infrastructure/stores/key-store";
import type { IIndexer } from "../../domain/interfaces/indexer.interface";
import type { IndexEntry } from "../../domain/common/indexer";
import type { IIdentifier, KeyMetadata, IKey } from "@veramo/core";

/**
 * Identity Service Options
 */
export interface IdentityServiceOptions {
  storeDir?: string;
}

/**
 * Identity Service
 * Coordinates DID, Key, and Index for managing identities
 */
export class IdentityService {
  constructor(
    private didStore: IDidStore,
    private keyStore: IKeyStore,
    private indexer: IIndexer, // Now just using the indexer
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
      this.logInfo(`Creating identity with alias "${alias}"...`);

      // First, validate alias is available
      if (this.indexer.aliasExists(alias)) {
        return Result.fail(`Identity with alias "${alias}" already exists`);
      }

      // 1. Create a key
      const keyResult = await this.keyStore.create("Ed25519", {
        name: alias,
        ...meta,
      });

      if (!keyResult.isSuccess || !keyResult.value) {
        return Result.fail(
          `Failed to create key: ${keyResult.errorMessage}`,
          keyResult.errorCause,
        );
      }

      const key = keyResult.value;

      // 2. Create a DID with the key
      const didResult = await this.didStore.create(alias, {
        keyId: key.kid,
        keyType: "Ed25519",
      });

      if (!didResult.isSuccess || !didResult.value) {
        // Clean up the key if DID creation fails
        await this.keyStore.delete(key.kid);
        return Result.fail(
          `Failed to create DID: ${didResult.errorMessage}`,
          didResult.errorCause,
        );
      }

      const did = didResult.value;

      // 3. Create and index the identity entry
      const entry: IndexEntry = {
        alias,
        did: did.did,
        kid: key.kid,
        description: meta?.description || "",
        createdAt: new Date().toISOString(),
        meta: {
          ...meta,
        },
        source: "local",
      };

      this.indexer.create(entry);

      this.logInfo(
        `Successfully created identity "${alias}" with DID ${did.did}`,
      );
      return Result.success(entry);
    } catch (error) {
      this.logError(`Failed to create identity: ${error}`);
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
      this.logInfo(`Deleting identity with alias or DID "${aliasOrDid}"...`);

      // 1. Find the identity
      const entryResult = this.getIdentity(aliasOrDid);

      if (!entryResult.isSuccess || !entryResult.value) {
        return Result.fail(`Identity "${aliasOrDid}" not found`);
      }

      const entry = entryResult.value;

      // 2. Delete DID
      const didResult = await this.didStore.delete(entry.did);
      if (!didResult.isSuccess) {
        this.logError(
          `Failed to delete DID ${entry.did}: ${didResult.errorMessage}`,
        );
        // Continue with deletion attempts even if DID deletion fails
      }

      // 3. Delete key
      const keyResult = await this.keyStore.delete(entry.kid);
      if (!keyResult.isSuccess) {
        this.logError(
          `Failed to delete key ${entry.kid}: ${keyResult.errorMessage}`,
        );
        // Continue with deletion attempts even if key deletion fails
      }

      // 4. Delete index entry
      this.indexer.delete(entry.alias);

      this.logInfo(`Successfully deleted identity "${entry.alias}"`);
      return Result.success(undefined);
    } catch (error) {
      this.logError(`Failed to delete identity: ${error}`);
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
      this.logError(`Failed to list identities: ${error}`);
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
      this.logInfo(`Getting identity with alias or DID "${aliasOrDid}"...`);
      const entry = this.indexer.get(aliasOrDid);
      return Result.success(entry);
    } catch (error) {
      this.logError(`Failed to get identity: ${error}`);
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
      this.logInfo(
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
      const didResult = await this.didStore.update(entry.did, {
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

      this.logInfo(
        `Successfully renamed identity from "${currentAlias}" to "${newAlias}"`,
      );
      return Result.success(newEntry);
    } catch (error) {
      this.logError(`Failed to rename identity: ${error}`);
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
      this.logInfo(
        `Getting detailed information for identity "${aliasOrDid}"...`,
      );

      // 1. Find the identity
      const entryResult = this.getIdentity(aliasOrDid);
      if (!entryResult.isSuccess || !entryResult.value) {
        return Result.fail(`Identity "${aliasOrDid}" not found`);
      }

      const entry = entryResult.value;

      // 2. Get DID document
      const didResult = await this.didStore.get(entry.did);
      if (!didResult.isSuccess) {
        return Result.fail(
          `Failed to get DID document: ${didResult.errorMessage}`,
        );
      }

      const didDoc = didResult.value;

      // 3. Get associated keys
      const keys = [];

      const keyPromises = didDoc.keys.map((k) => this.keyStore.get(k.kid));

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
      this.logError(`Failed to get identity details: ${error}`);
      return Result.fail(
        `Failed to get identity details: ${error}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  public test() {
    this.logInfo("IdentityService is working!");
  }

  private logInfo(message: string): void {
    this.logger?.info(message);
  }

  private logError(message: string, error?: unknown): void {
    this.logger?.error(message, error);
  }
}
