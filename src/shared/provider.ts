import type { Result } from "@synet/patterns";
import type { IIdentifier, TKeyType, KeyMetadata, IKey, ManagedPrivateKey } from "@synet/identity-core";
import type { BaseCredentialSubject, SynetVerifiableCredential } from "@synet/credentials";


export interface IDidServiceProvider {
  create(
    alias: string,
    options?:{ keyId: string; keyType?: TKeyType },
  ): Promise<Result<IIdentifier>>;
  get(did: string): Promise<Result<IIdentifier>>;
  find(filter: { alias?: string }): Promise<Result<IIdentifier[]>>;
  update(
    did: string,
    options: { alias?: string },
  ): Promise<Result<IIdentifier>>;
  delete(did: string): Promise<Result<boolean>>;
}

export interface IKeyServiceProvider {
  create(type: TKeyType, meta?: KeyMetadata): Promise<Result<IKey>>;
  get(kid: string): Promise<Result<IKey>>;
  delete(kid: string): Promise<Result<boolean>>;
}

export interface IPrivateKeyProvider {

  get(kid: string): Promise<Result<ManagedPrivateKey>>;
}

export interface IVCServiceProvider {
  issueVC<S extends BaseCredentialSubject = BaseCredentialSubject>(
    subject: S,
    credentialType: string[],
    issuerDid?: string,
    options?: {
      vcId?: string;
      context?: string[];
      issuanceDate?: string;
      expirationDate?: string;
    }
  ): Promise<Result<SynetVerifiableCredential<S>>>;  // Return the specific type S

  verifyVC(vc: SynetVerifiableCredential): Promise<Result<boolean>>;
  getVC(id: string): Promise<Result<SynetVerifiableCredential | null>>;
  listVCs(): Promise<Result<SynetVerifiableCredential[]>>;
  deleteVC(id: string): Promise<Result<boolean>>;
  storeVC(vc: SynetVerifiableCredential): Promise<Result<void>>;

}

export interface VCServiceOptions {
  defaultIssuerDid?: string;
}

export interface ProviderServices {
  didService: IDidServiceProvider;
  keyService: IKeyServiceProvider;
  vcService: IVCServiceProvider;
  privateKeyService: IPrivateKeyProvider;
}