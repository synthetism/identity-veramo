import type {
  W3CVerifiableCredential,
  IKeyManager,
  IDIDManager,
  TAgent,
  ICredentialPlugin,
} from "@veramo/core";
import { createId } from '@paralleldrive/cuid2'
import { Result } from "@synet/patterns";
import type { IIndexer } from "@synet/patterns/storage";
import type { Logger } from "@synet/logger";
import type { IVCStore } from "../storage/vcs/vc-store.interface";
import type { SynetVerifiableCredential } from "@synet/credentials";
import type { IndexEntry } from "../storage/vcs/types";
import type { IFileVCIndexer } from "src/storage/vcs/file-vc-indexer.interface";
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
 * Service for managing Verifiable Credentials
 */
export class VCService<T extends SynetVerifiableCredential> implements IVCService {
  constructor(
    private readonly agent: TAgent<
      IKeyManager & IDIDManager & ICredentialPlugin
    >,
    private readonly indexer: IFileVCIndexer,
    private readonly storage?: IVCStore<T>,
    private readonly options: VCServiceOptions = {},
    private readonly logger?: Logger,
  ) {

    this.ensureIndex().catch((error) => {
      this.logger?.error("Failed to ensure index:", error);
    });
  }

  /**
   * Ensure index exists and is up-to-date
   */
  private async ensureIndex(): Promise<void> {
    try {
      if (!this.indexer.exists()) {
        this.logger?.debug("Key index does not exist, creating new index");
        await this.rebuildIndex();
      }
    } catch (error) {
      this.logger?.error("Error ensuring index:", error);
    }
  }

  /**
   * Rebuild the index from the repository
   */
  private async rebuildIndex(): Promise<void> {
    try {
      this.logger?.info("Rebuilding key index from repository");
      const keysResult = await this.listVCs();

      if (keysResult.isSuccess && keysResult.value) {
        
        const indexEntries: IndexEntry[] = keysResult.value.map((key) => ({
          id: key.id,
          alias: key.id.split(":").pop() || createId(),
          type: key.type,
          createdAt: key.issuanceDate,
        }));

        this.indexer.rebuild(indexEntries);

      } else {
        this.logger?.error("Failed to rebuild index:", keysResult.errorMessage);
      }
    } catch (error) {
      this.logger?.error("Error rebuilding index:", error);
    }
  }

  generateVCId = (type: string): string => {
    const cuid = createId(); // optionally pass config

    return `urn:synet:${type}:${cuid}`;
  }

  /**
   * Issue a new verifiable credential
   * @param subject The credential subject data
   * @param type Additional credential types
   * @param issuerDid Optional issuer DID (uses default if not provided)
   * @returns Result containing the issued credential
   */
  async issueVC<S extends Record<string, unknown>>(
    subject: S,
    type: string | string[],
    issuerDid?: string,
    options?: {
      vcId?: string; // Optional ID for the credential
      context?: string[];
      issuanceDate?: string;
      expirationDate?: string;
    }
  ): Promise<Result<T>> {
    try {

      const defaultContext= ['https://www.w3.org/2018/credentials/v1'];
      
      if(options?.context) {
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

        // Store the credential if storage is configured
        const saveResult = await this.save(vc);

        if(!saveResult.isSuccess) {
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
   * @param vc The verifiable credential to verify
   * @returns Result with verification status
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
   * @param id Credential ID
   * @returns Result with the credential or null if not found
   */
  async getVC(id: string): Promise<Result<T | null>> {
    if (!this.storage) {
      return Result.fail("Storage not configured for VC service");
    }

    try {

      const vc = await this.storage.get(id);
      return Result.success(vc);
    } catch (error) {
      return Result.fail(
        `Error retrieving credential: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * List all stored credentials
   * @returns Result with array of credentials
   */
  async listVCs(): Promise<Result<T[]>> {
    if (!this.storage) {
      return Result.fail("Storage not configured for VC service");
    }

    try {
      const index = await this.indexer.list();

      const vcs: T[] = [];

      for (const vc of index) {
        const storedVC = await this.storage.get(vc.alias);
        if (storedVC) {
          vcs.push(storedVC);
        }
      }

      return Result.success(vcs);

    } catch (error) {
      return Result.fail(
        `Error listing credentials: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Delete a credential by ID
   * @param id Credential ID
   * @returns Result with deletion status
   */
  async deleteVC(id: string): Promise<Result<boolean>> {
    if (!this.storage) {
      return Result.fail("Storage not configured for VC service");
    }

    try {
      const deleted = await this.storage.delete(id);
      return Result.success(deleted);
    } catch (error) {
      return Result.fail(
        `Error deleting credential: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  async storeVC(
    vc: T,
  ): Promise<Result<void>> {
    

    if (!vc.id) {
      return Result.fail("Credential must have an ID to be stored");
    }
    try {

      const saveResult = await this.save(vc);

       if(!saveResult.isSuccess) {
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
    if (!this.storage) {
      return Result.fail("Storage not configured for VC service");
    }

    try {
      const id = vc.id;
     
      const alias = id.split(":").pop()
      if(alias === undefined) {
        return Result.fail("Invalid credential ID format");
      }

      if(await this.indexer.aliasExists(alias)) {
        this.logger?.debug(`Credential with alias ${alias} already exists, skipping save`);
        return Result.success(undefined);
      }
 
      await this.storage.create(alias,vc);

      this.indexer.create({
        id: vc.id,
        alias: alias,
        type: vc.type || ["VerifiableCredential"],
        createdAt: vc.issuanceDate || new Date().toISOString(),
        issuerId: vc.issuer?.id || this.options.defaultIssuerDid,
        expirationDate: vc.expirationDate,
      });
       this.logger?.debug(`Stored credential ${id} with alias ${alias}`);



      return Result.success(undefined);
    } catch (error) {
      return Result.fail(
        `Error saving VC store: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}
