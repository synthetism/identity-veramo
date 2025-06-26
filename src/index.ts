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
import type { SynetVerifiableCredential } from "@synet/credentials";

/* Storage */
import { createIndexer } from "./storage/indexer/indexer-factory";
import { NodeFileSystem } from "./storage/filesystem/filesystem";

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
import { createVault, type Vault, type StorageAdapters } from "@synet/vault";

// Export file system implementations
export * from "./services/vc-service";
export * from "./services/identity-service";

export type { IIdentifier, IKey, DIDDocument, W3CVerifiableCredential, VerifiableCredential, IssuerType } from "@veramo/core";

export enum StorageType {
  FILE = "file",
  ENCRYPTED = "encrypted", // Future: Implement encrypted storage
  CLOUD = "cloud",
}

export type { IdentityService, VCService };

/**
 * Create an identity service with vault-based storage
 */
export function createIdentityService(
  options: IdentityServiceOptions = {},
  logger?: Logger,
): IdentityService {
   
  const effectiveLogger = logger || getNullLogger();
  const storeDir = options.storeDir || path.join(os.homedir(), ".synet");

  const filesystem = new NodeFileSystem();
  //const idIndexer = createIndexer(storeDir, 'identity', filesystem, logger);

  // Create vault system
  const vault = createVault({
    storeDir: path.join(storeDir, "vaults")
  }, effectiveLogger);

  const agent = createAgentWithKMS(vault.adapters);

  const didService = new DidService(agent, effectiveLogger);
  const keyService = new KeyService(agent, effectiveLogger);
  
  // Create VC service with vault's VC store
  const vcService = new VCService<SynetVerifiableCredential>(
    agent, 
    vault.adapters.vcStore, 
    options, 
    effectiveLogger
  );

  return new IdentityService(
    didService,
    keyService,
    vcService,
    {
      ...options,
      vaultOperator: vault.operator
    },
    effectiveLogger,
  );
}

// Add a standalone function to create just the VC service with vault
export function createVCService<T extends SynetVerifiableCredential>(
  options: VCServiceOptions & { storeDir?: string } = {},
  logger?: Logger,
): VCService<T> {
  const effectiveLogger = logger || getNullLogger();
  const storeDir = options.storeDir || path.join(os.homedir(), ".synet");
      
  // Create vault system for VC storage
  const vault = createVault({
    storeDir: path.join(storeDir, "vaults")
  }, effectiveLogger);

  const agent = createAgentWithKMS(vault.adapters);

  return new VCService<T>(agent, vault.adapters.vcStore, options, effectiveLogger);
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