import { Result } from "@synet/patterns";
import type { Logger } from "@synet/logger";
import type {
  IKeyManager,
  IKey,
  KeyMetadata,
  TAgent,
  TKeyType,
} from "@veramo/core";

/**
 * Interface for key store operations
 * methods:
 * @method create: Create a new key of specified type
 * @method get: Retrieve a key by its ID
 * @method delete: Delete a key by its ID
 */
export interface IKeyService {
  create(type: TKeyType, meta?: KeyMetadata): Promise<Result<IKey>>;
  get(kid: string): Promise<Result<IKey>>;
  delete(kid: string): Promise<Result<boolean>>;
}

/**
 * Veramo implementation of the key service
 */
export class KeyService implements IKeyService {
  constructor(
    private agent: TAgent<IKeyManager>,
    private logger?: Logger,
  ) {}

  async create(type: TKeyType, meta?: KeyMetadata): Promise<Result<IKey>> {
    try {
      this.logger?.info(`Creating key of type ${type}`);

      const keyData = await this.agent.keyManagerCreate({
        kms: "local",
        type,
        meta: {
          ...meta,
          createdAt: meta?.createdAt || new Date().toISOString(),
        },
      });

      this.logger?.info(`Created key: ${keyData.kid}`);
      return Result.success(keyData);
    } catch (error) {
      this.logger?.error(`Failed to create key: ${error}`);
      return Result.fail(
        `Failed to create key: ${error}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  async get(kid: string): Promise<Result<IKey>> {
    try {
      this.logger?.info(`Getting key with ID: ${kid}`);
      const key = await this.agent.keyManagerGet({ kid });
      return Result.success(key);
    } catch (error) {
      this.logger?.error(`Failed to get key ${kid}: ${error}`);
      return Result.fail(`Failed to get key: ${error}`);
    }
  }

  async delete(kid: string): Promise<Result<boolean>> {
    try {
      this.logger?.info(`Deleting key: ${kid}`);
      await this.agent.keyManagerDelete({ kid });
      return Result.success(true);
    } catch (error) {
      this.logger?.error(`Failed to delete key ${kid}: ${error}`);
      return Result.fail(`Failed to delete key: ${error}`);
    }
  }

}
