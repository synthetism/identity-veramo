import type {
  W3CVerifiableCredential,
  IKeyManager,
  IDIDManager,
  TAgent,
  ICredentialPlugin,
} from "@veramo/core";
import { createId } from '@paralleldrive/cuid2'
import { Result } from "@synet/patterns";
import type { Logger } from "@synet/logger";
import type { SynetVerifiableCredential, BaseCredentialSubject } from "@synet/credentials";
import type { AbstractVCStore } from "@synet/vault-core";

export interface VCServiceOptions {
  defaultIssuerDid?: string;
}

export interface IVCService<T = unknown> {
  issueVC<S extends Record<string, unknown>>(
    subject: S,
    type: string[],
    issuerDid?: string,
  ): Promise<Result<T>>;

  verifyVC(vc: T): Promise<Result<boolean>>;

  getVC(id: string): Promise<Result<T | null>>;

  listVCs(): Promise<Result<T[]>>;

  deleteVC(id: string): Promise<Result<boolean>>;
}

/**
 * Service for managing Verifiable Credentials with vault storage
 */
export class VCService<T extends SynetVerifiableCredential> implements IVCService {
  constructor(
    private readonly agent: TAgent<
      IKeyManager & IDIDManager & ICredentialPlugin
    >,
    private readonly storage: AbstractVCStore,
    private readonly options: VCServiceOptions = {},
    private readonly logger?: Logger,
  ) {}

  generateVCId = (type: string): string => {
    const cuid = createId();
    return `urn:synet:${type}:${cuid}`;
  }

  /**
   * Issue a new verifiable credential
   */
  async issueVC<S extends Record<string, unknown>>(
    subject: S,
    type: string | string[],
    issuerDid?: string,
    options?: {
      vcId?: string;
      context?: string[];
      issuanceDate?: string;
      expirationDate?: string;
    }
  ): Promise<Result<T>> {
    try {
      const defaultContext = ['https://www.w3.org/2018/credentials/v1'];
      
      if (options?.context) {
        const contextArray = Array.isArray(options.context) ? options.context : [options.context];
        defaultContext.push(...contextArray);
      }
      const context = options?.context || defaultContext;
    
      // Use provided issuer or default
      const effectiveIssuerDid = issuerDid || this.options.defaultIssuerDid;

      if (!effectiveIssuerDid) {
        return Result.fail("No issuer DID specified and no default configured");
      }

      // Verify the issuer DID exists
      try {
        const issuerIdentifier = await this.agent.didManagerGet({
          did: effectiveIssuerDid,
        });
        if (!issuerIdentifier) {
          return Result.fail(
            `Issuer DID ${effectiveIssuerDid} not found in agent's DID manager`,
          );
        }
      } catch (error) {
        return Result.fail(
          `Error retrieving issuer DID: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Generate a unique ID for the credential
      const typeArray = Array.isArray(type) ? type : [type];
      const appType = typeArray.find(t => t !== "VerifiableCredential") || "Generic";
      const vcId = options?.vcId || this.generateVCId(appType);

      try {
        // Create the credential
        const vc = (await this.agent.createVerifiableCredential({
          credential: {
            id: vcId,
            '@context': context,
            issuer: { id: effectiveIssuerDid },
            type: ["VerifiableCredential", ...typeArray],
            issuanceDate: options?.issuanceDate || new Date().toISOString(),
            expirationDate: options?.expirationDate,
            credentialSubject: subject,
          },
          proofFormat: "jwt",
        })) as T;

        // Store the credential
        const saveResult = await this.save(vc);

        if (!saveResult.isSuccess) {
          this.logger?.error(`Failed to save credential: ${saveResult.errorMessage}`);
        }

        this.logger?.debug(
          `Issued credential ${vcId} with types [${typeArray.join(", ")}]`,
        );
        return Result.success(vc);
        
      } catch (error) {
        return Result.fail(
          `Error creating verifiable credential: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    } catch (error) {
      return Result.fail(
        `Unexpected error issuing credential: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Verify a credential
   */
  async verifyVC(vc: T): Promise<Result<boolean>> {
    try {
      const result = await this.agent.verifyCredential({
        credential: vc,
      });

      if (!result.verified) {
        return Result.fail(`Credential verification failed: ${result.error}`);
      }

      return Result.success(true);
    } catch (error) {
      return Result.fail(
        `Error verifying credential: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Retrieve a credential by ID
   */
  async getVC(id: string): Promise<Result<T | null>> {
    try {
      const alias = id.split(":").pop() || id;
      const vc = await this.storage.get(alias);
      return Result.success(vc as T | null);
    } catch (error) {
      return Result.fail(
        `Error retrieving credential: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * List all stored credentials
   */
  async listVCs(): Promise<Result<T[]>> {
    try {
      const vcs = await this.storage.list();
      return Result.success(vcs as T[]);
    } catch (error) {
      return Result.fail(
        `Error listing credentials: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Delete a credential by ID
   */
  async deleteVC(id: string): Promise<Result<boolean>> {
    try {
      const alias = id.split(":").pop() || id;
      const deleted = await this.storage.delete(alias);
      return Result.success(deleted);
    } catch (error) {
      return Result.fail(
        `Error deleting credential: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  async storeVC(vc: T): Promise<Result<void>> {
    if (!vc.id) {
      return Result.fail("Credential must have an ID to be stored");
    }
    
    try {
      const saveResult = await this.save(vc);
      if (!saveResult.isSuccess) {
        this.logger?.error(`Failed to save credential: ${saveResult.errorMessage}`);
      }
      return Result.success(undefined);
    } catch (error) {
      return Result.fail(
        `Error storing credential: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  async save(vc: T): Promise<Result<void>> {
    try {
      const id = vc.id;
      const alias = id.split(":").pop();
      
      if (alias === undefined) {
        return Result.fail("Invalid credential ID format");
      }

      if (await this.storage.exists(alias)) {
        this.logger?.debug(`Credential with alias ${alias} already exists, skipping save`);
        return Result.success(undefined);
      }

      await this.storage.create(alias, vc as SynetVerifiableCredential<BaseCredentialSubject>);

      this.logger?.debug(`Stored credential ${id} with alias ${alias}`);
      return Result.success(undefined);
    } catch (error) {
      return Result.fail(
        `Error saving VC: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}