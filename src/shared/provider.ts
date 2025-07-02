import type { Result } from "@synet/patterns";
import type { IIdentifier, TKeyType, KeyMetadata, IKey } from "@veramo/core-types";
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

export interface IVCServiceProvider {
  issueVC<S extends Record<string, unknown>>(
    subject: S,
    type: string[],
    issuerDid?: string,
  ): Promise<Result<SynetVerifiableCredential>>;

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
}