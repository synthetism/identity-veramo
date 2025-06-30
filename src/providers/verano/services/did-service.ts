import { Result } from "@synet/patterns";
import type { Logger } from "@synet/logger";
import type { IDIDManager, IIdentifier, TAgent, TKeyType } from "@veramo/core";
import type { IDidService } from "../../../shared/provider";
import Debug from 'debug'
const debug = Debug('synet:identity:did-service');

/**
 * Interface for DID store operations
 * Methods:
 * @method create: Create a new DID with an alias and optional key type
 * @method get: Retrieve a DID by its identifier
 * @method find: Find DIDs by an optional filter (e.g., alias)
 * @method update: Update a DID's alias or other properties
 * @method delete: Delete a DID by its identifier
 */


/**
 * Veramo implementation of the DID service
 */
export class DidService implements IDidService {
  constructor(
    private agent: TAgent<IDIDManager>,
    private logger?: Logger,
  ) {}

  async create(
    alias: string,
    options: { keyType?: string } = {},
  ): Promise<Result<IIdentifier>> {
    try {

      this.logger?.debug('Creating DID with alias {alias}...',{ alias:alias });

      const didData = await this.agent.didManagerCreate({
        provider: "did:key",
        options: {
          alias: alias,
          keyType: options.keyType || "Ed25519",
        },
      });
    
      
      this.logger?.debug(`Created DID: ${didData.did}`);

      return Result.success(didData);
    } catch (error) {
      this.logger?.error(`Failed to create DID: ${error}`);
      return Result.fail(
        `Failed to create DID: ${error}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  async get(did: string): Promise<Result<IIdentifier>> {
    try {
      this.logger?.debug(`Getting DID: ${did}`);
      const didDoc = await this.agent.didManagerGet({ did });
      return Result.success(didDoc);
    } catch (error) {
      this.logger?.error(`Failed to get DID ${did}: ${error}`);
      return Result.fail(`Failed to get DID: ${error}`);
    }
  }

  async find(filter: { alias?: string } = {}): Promise<Result<IIdentifier[]>> {
    try {
      this.logger?.debug(`Finding DIDs with filter: ${JSON.stringify(filter)}`);
      const dids = await this.agent.didManagerFind(filter);
      return Result.success(dids);
    } catch (error) {
      this.logger?.error(`Failed to find DIDs: ${error}`);
      return Result.fail(`Failed to find DIDs: ${error}`);
    }
  }

  async update(
    did: string,
    options: { alias?: string } = {},
  ): Promise<Result<IIdentifier>> {
    try {
      this.logger?.debug(
        `Updating DID ${did} with options: ${JSON.stringify(options)}`,
      );

      await this.agent.didManagerUpdate({
        did,
        document: {}, // Empty document - we're just updating options
        options,
      });

      // Return the updated DID document
      const updatedDid = await this.agent.didManagerGet({ did });
      return Result.success(updatedDid);
    } catch (error) {
      this.logger?.error(`Failed to update DID ${did}: ${error}`);
      return Result.fail(`Failed to update DID: ${error}`);
    }
  }

  async delete(did: string): Promise<Result<boolean>> {
    try {
      this.logger?.debug(`Deleting DID: ${did}`);
      await this.agent.didManagerDelete({ did });
      return Result.success(true);
    } catch (error) {
      this.logger?.error(`Failed to delete DID ${did}: ${error}`);
      return Result.fail(`Failed to delete DID: ${error}`);
    }
  }

}
