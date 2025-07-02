
import { Result } from "@synet/patterns";
import type { Logger } from "@synet/logger";

import type {  IPrivateKeyProvider} from "../../../shared/provider";
import type { AbstractPrivateKeyStore, ManagedPrivateKey } from "../domain/interfaces/abstract-private-key-store";

/**
 * Service for managing Verifiable Credentials with vault storage
 */
export class VeramoPrivateKeyService implements IPrivateKeyProvider {
  constructor(

    private readonly storage: AbstractPrivateKeyStore,
    private readonly logger?: Logger,
  ) {}

  async get(kid: string): Promise<Result<ManagedPrivateKey>> {
    const privateKey = await this.storage.getKey({ alias: kid });

    if (!privateKey) {
      this.logger?.error(`Private key not found for kid: ${kid}`);
      return Result.fail(
        `Private key not found for kid: ${kid}`,
        new Error(`Private key not found for kid: ${kid}`),
      );
    }

    return Result.success(privateKey);
  }
}