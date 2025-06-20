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
import { DIDManager } from "@veramo/did-manager";
import { KeyDIDProvider } from "@veramo/did-provider-key";
import { CredentialPlugin } from "@veramo/credential-w3c";
import { getNullLogger, type Logger } from "@synet/logger";
import type { SynetVerifiableCredential } from "./types/credential";

/* Storage */

import { createIndexer } from "./storage/indexer/indexer-factory";
import { NodeFileSystem } from "./storage/filesystem/filesystem";
import { MemFileSystem } from "./storage/filesystem/memory";

/* Services */

import { DidService } from "./services/did-service";
import { KeyService } from "./services/key-service";

import {
  VCService,
  type VCServiceOptions,
  type IVCService,
} from "./services/vc-service";

import {
  IdentityService,
  type IdentityServiceOptions,
} from "./services/identity-service";

import path from "node:path";
import os from "node:os";
import { createStorageAdapters, type StorageAdapters } from "./storage/adapters/adapter-factory";
import { createVCStore, createVCIndexer } from "./storage/vcs/vc-store-factory";

// Export file system implementations
export * from "./services/vc-service";

export type { IIdentifier, IKey, DIDDocument, W3CVerifiableCredential, VerifiableCredential, IssuerType } from "@veramo/core";

export enum StorageType {
  FILE = "file",
  ENCRYPTED = "encrypted", // Future: Implement encrypted storage
  CLOUD = "cloud",
}
export type {IdentityService,  VCService};
/**
 * Create an identity service with the specified storage type
 */
export function createIdentityService(
  options: IdentityServiceOptions = {},
  logger?: Logger,
): IdentityService {
   
   const effectiveLogger = logger || getNullLogger();
   const storeDir =
   options.storeDir || path.join(os.homedir(), ".synet", "identity");

   const filesystem = new NodeFileSystem();
   const idIndexer = createIndexer(storeDir, 'identity', filesystem, logger);

   const adapters = createStorageAdapters({
     storeDir,
     filesystem,
     logger: effectiveLogger
   });

   const agent = createAgentWithKMS(adapters);

   const didStore = new DidService(agent, effectiveLogger);
   const keyStore = new KeyService(agent, effectiveLogger);

  return new IdentityService(
    didStore,
    keyStore,
    idIndexer,
    options,
    effectiveLogger,
  );
}

// Add a standalone function to create just the VC service
export function createVCService<T extends SynetVerifiableCredential>(
  options: VCServiceOptions & { storeDir?: string } = {},
  logger?: Logger,
): VCService<T> {
  const effectiveLogger = logger || getNullLogger();
  const storeDir =
    options.storeDir || path.join(os.homedir(), ".synet", "vcs");
      
  const filesystem = new NodeFileSystem();

  const adapters = createStorageAdapters({
    storeDir,
    filesystem,
    logger: effectiveLogger
  });
  
  const agent = createAgentWithKMS(adapters);
  const vcStore = createVCStore<T>({
    storeDir,
    filesystem,
    logger: effectiveLogger
  });

  const vcIndexer = createVCIndexer({
    storeDir,
    filesystem,
    logger: effectiveLogger
  });

  return new VCService<T>(agent, vcIndexer, vcStore, options, effectiveLogger);
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
