import {
  createAgent,
  type IKeyManager,
  type IDIDManager,
  type TAgent,
  type DIDDocument,
  type W3CVerifiableCredential,
  type ICredentialPlugin,
} from "@veramo/core";
import { KeyManager } from "@veramo/key-manager";
import { KeyManagementSystem } from "@veramo/kms-local";
import { DIDManager} from "@veramo/did-manager";
import { KeyDIDProvider } from "@veramo/did-provider-key";
import { CredentialPlugin } from "@veramo/credential-w3c";
import { getNullLogger, type Logger } from "@synet/logger";
import type { SynetVerifiableCredential, BaseCredentialSubject } from "@synet/credentials";

import type { AbstractDIDStore } from "./domain/interfaces/abstract-did-store";
import type { AbstractKeyStore } from "./domain/interfaces/abstract-key-store";
import type { AbstractPrivateKeyStore } from "./domain/interfaces/abstract-private-key-store";
import type { AbstractVCStore } from "./domain/interfaces/abstract-vc-store";

/* Services */
import { DidService } from "./services/did-service";
import { KeyService } from "./services/key-service";
import { VCService } from "./services/vc-service";

import path from "node:path";
import os from "node:os";

import { createAdapters } from "./adapters/adapter-factory";
import type { IFileSystem } from "../../shared/filesystem/filesystem.interface";
import { MemFileSystem } from "../../shared/filesystem/memory";

import type { ProviderServices } from "../../shared/provider";
import { ObservableFileSystem } from "../../shared/filesystem/observable";

// Export file system implementations
export * from "./services/vc-service";

export type { IIdentifier, IKey, DIDDocument, W3CVerifiableCredential, VerifiableCredential, IssuerType } from "@veramo/core";
import {fileSystemChangeEmitter } from "@synet/vault-core";
/**
 * Create an identity service with vault-based storage
 */

interface StorageAdapters {
  keyStore: AbstractKeyStore;
  privateKeyStore: AbstractPrivateKeyStore;
  didStore: AbstractDIDStore;
  vcStore: AbstractVCStore;
}


interface ProviderOptions {
  storeDir?: string;
}

export function createVeramoProvider(
  options: ProviderOptions,
  filesystem: IFileSystem, // Default to in-memory file system
  logger?: Logger,
): ProviderServices {
   
  const storeDir = options.storeDir || path.join(os.homedir(), ".synet");

  //const eventEmitter = fileSystemChangeEmitter;
  //const observableFs = new ObservableFileSystem(filesystem, eventEmitter, logger);

  const adapters = createAdapters(
    storeDir,
    filesystem,
    logger
  );
  const effectiveLogger = logger || getNullLogger();
  const agent = createAgentWithKMS(adapters);
  const didService = new DidService(agent, effectiveLogger);
  const keyService = new KeyService(agent, effectiveLogger);  
  const vcService = new VCService(
    agent, 
    adapters.vcStore, 
    {},
    effectiveLogger
  );

  return {
    didService,
    keyService,
    vcService,
  }
}

function createAgentWithKMS(
  adapters: StorageAdapters,
): TAgent<IKeyManager & IDIDManager & ICredentialPlugin> {

  const { keyStore, didStore, privateKeyStore } = adapters;

  return createAgent<IKeyManager & IDIDManager & ICredentialPlugin>({
    plugins: [
      new KeyManager({
        store: keyStore,
        kms: {
          local: new KeyManagementSystem(
            privateKeyStore,
          ),
        },
      }),
      new DIDManager({
        store: didStore,
        defaultProvider: "did:key",
        providers: {
          "did:key": new KeyDIDProvider({
            defaultKms: "local",
          }),
        },
      }),
      new CredentialPlugin(),
    ],
  });
}