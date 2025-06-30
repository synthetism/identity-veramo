import { Result } from '@synet/patterns';
import { ValueObject } from '@synet/patterns';
import type { Identity as IdentityProps} from '../types' 
//import type { IIdentity } from '@synet/identity-core/dist/identity-types';
import type {SynetVerifiableCredential, BaseCredentialSubject} from '@synet/credentials';


export interface IIdentity {
  alias: string
  did: string
  kid: string
  publicKeyHex: string
  privateKeyHex?: string // Optional private key, can be used for signing
  provider: string // did:key | did:web
  credential: SynetVerifiableCredential<BaseCredentialSubject>
  metadata?: Record<string, unknown>
  createdAt: Date // Optional creation date for the vault  
  version?: string
  
}

/**
 *  
 *
 * 
 */
export class IdentityUnit extends ValueObject<IIdentity> {
  private constructor(props: IIdentity) {
    super(props);
  }

  /**
   * Create a new VaultId with validation
   */
  public static create(props: {
    alias:string,
    did: string,
    kid: string,
    publicKeyHex: string,
    privateKeyHex?: string, // Optional private key, can be used for signing
    credential: SynetVerifiableCredential<BaseCredentialSubject>,
    provider: string, // did:key | did:web
    metadata?: Record<string, unknown>,
    createdAt?: Date, 
    version?: string 
  }

  ): Result<IdentityUnit> {

    if (!props.alias) {
      return Result.fail('Vault Alias  empty');
    }

    // Allow alphanumeric characters, numbers, dashes, and underscores
    // Removed the restrictive pattern that prevented "new" from being used
    if (!/^[a-zA-Z0-9_-]+$/.test(props.alias)) {
      return Result.fail('Only alphanumeric characters, numbers, dashes, and underscores are allowed in vault ID');
    }

    // Check for minimum and maximum length
    if (props.alias.length < 2 || props.alias.length > 32) {
      return Result.fail('Vault Alias must be between 2 and 32 characters');
    }

     const createdAt = props.createdAt || new Date();

    return Result.success(new IdentityUnit({
      did: props.did,
      alias: props.alias,
      kid: props.kid,
      publicKeyHex: props.publicKeyHex,
      privateKeyHex: props.publicKeyHex, // Assuming publicKeyHex is used as privateKeyHex
      provider: props.provider,
      credential: props.credential,
      metadata: props.metadata || {},
      createdAt: createdAt,
      version: props.version || '1.0.0',
    }));
  }

  get alias(): string {
    return this.props.alias;
  }

  toString(): string {
    return JSON.stringify(this.props);
  }
}