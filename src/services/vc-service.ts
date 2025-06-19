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
import { v4 as uuidv4 } from "uuid";
import type { IVCStore } from "../storage/vcs/vc-store.interface";
import type { SynetVerifiableCredential } from "../types/credential";

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
export class VCService<SynetVerifiableCredential> implements IVCService {
  constructor(
    private readonly agent: TAgent<
      IKeyManager & IDIDManager & ICredentialPlugin
    >,
    private readonly storage?: IVCStore<SynetVerifiableCredential>,
    private readonly options: VCServiceOptions = {},
    private readonly logger?: Logger,
  ) {}

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
  ): Promise<Result<SynetVerifiableCredential>> {
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
        })) as SynetVerifiableCredential;

        // Store the credential if storage is configured
        if (this.storage) {
          await this.storage.create(vcId, vc);
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
  async verifyVC(vc: W3CVerifiableCredential): Promise<Result<boolean>> {
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
  async getVC(id: string): Promise<Result<SynetVerifiableCredential | null>> {
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
  async listVCs(): Promise<Result<SynetVerifiableCredential[]>> {
    if (!this.storage) {
      return Result.fail("Storage not configured for VC service");
    }

    try {
      const vcs = await this.storage.list();
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
}
