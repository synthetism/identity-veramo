import type {
  W3CVerifiableCredential,
  IKeyManager,
  IDIDManager,
  TAgent,
  ICredentialPlugin,
} from "@veramo/core";
import { Result } from "@synet/patterns";
import type { Logger } from "@synet/logger";
import { v4 as uuidv4 } from "uuid";
import type { IStorage } from "../storage/patterns/storage/promises";

export interface VCServiceOptions {
  defaultIssuerDid?: string;
}

export interface IVCService {
  issueVC(
    subject: Record<string, unknown>,
    type: string[],
    issuerDid?: string,
  ): Promise<Result<W3CVerifiableCredential>>;

  verifyVC(vc: W3CVerifiableCredential): Promise<Result<boolean>>;

  getVC(id: string): Promise<Result<W3CVerifiableCredential | null>>;

  listVCs(): Promise<Result<W3CVerifiableCredential[]>>;

  deleteVC(id: string): Promise<Result<boolean>>;
}

/**
 * Service for managing Verifiable Credentials
 */
export class VCService implements IVCService {
  constructor(
    private readonly agent: TAgent<
      IKeyManager & IDIDManager & ICredentialPlugin
    >,
    private readonly storage?: IStorage<W3CVerifiableCredential>,
    private readonly options: VCServiceOptions = {},
    private readonly logger?: Logger,
  ) {}

  /**
   * Issue a new verifiable credential
   * @param subject The credential subject data
   * @param type Additional credential types
   * @param issuerDid Optional issuer DID (uses default if not provided)
   * @returns Result containing the issued credential
   */
  async issueVC(
    subject: Record<string, unknown>,
    type: string[],
    issuerDid?: string,
  ): Promise<Result<W3CVerifiableCredential>> {
    try {
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
      const vcId = `urn:uuid:${uuidv4()}`;

      try {
        // Create the credential
        const vc = (await this.agent.createVerifiableCredential({
          credential: {
            issuer: { id: effectiveIssuerDid },
            type: ["VerifiableCredential", ...type],
            issuanceDate: new Date().toISOString(),
            credentialSubject: subject,
            id: vcId,
          },
          proofFormat: "jwt",
        })) as W3CVerifiableCredential;

        // Store the credential if storage is configured
        if (this.storage) {
          await this.storage.create(vcId, vc);
        }

        this.logger?.info(
          `Issued credential ${vcId} with types [${type.join(", ")}]`,
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
  async getVC(id: string): Promise<Result<W3CVerifiableCredential | null>> {
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
  async listVCs(): Promise<Result<W3CVerifiableCredential[]>> {
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
