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

/* Storage */

import { createIndexer } from "./storage/indexer/indexer-factory";
import { NodeFileSystem } from "./storage/filesystem/filesystem";
import { MemFileSystem } from "./storage/filesystem/memory";
import type { IStorage } from "./storage/patterns/storage/promises";

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

import type { IFileIndexer } from "./storage/indexer/file-indexer.interface";
import {
  FilePrivateKeyStore,
  FileKeyStore,
  FileDIDStore,
  FileVCStore,
} from "./storage/adapters/file/";

// Export domain entities, interfaces and common utilities

export * from "./storage/filesystem/filesystem.interface";
export * from "./storage/indexer/file-indexer.interface";

// Export file system implementations
export * from "./storage/filesystem/filesystem";
export * from "./storage/filesystem/memory";
export * from "./services/vc-service";

export type { IIdentifier, IKey, DIDDocument } from "@veramo/core";

export enum StorageType {
  FILE = "file",
  MEMORY = "memory",
  ENCRYPTED = "encrypted", // Future: Implement encrypted storage
  CLOUD = "cloud",
}

/**
 * Create an identity service with the specified storage type
 */
export function createIdentityService(
  storageType: StorageType = StorageType.FILE,
  options: IdentityServiceOptions = {},
  logger?: Logger,
): IdentityService {
  const effectiveLogger = logger || getNullLogger();
  const storeDir =
    options.storeDir || path.join(os.homedir(), ".synet", "identity");
  let agent: TAgent<IKeyManager & IDIDManager & ICredentialPlugin>;
  let idIndexer: IFileIndexer;

  switch (storageType) {
    case StorageType.FILE: {
      const fileSystem = new NodeFileSystem();
      fileSystem.ensureDirSync(storeDir);
      idIndexer = createIndexer(storeDir, fileSystem, logger);
      agent = createAgentWithKMS(storeDir, effectiveLogger);
      break;
    }

    case StorageType.MEMORY: {
      const fileSystem = new MemFileSystem();
      const tempDir = "/tmp/.synet/identity";
      fileSystem.ensureDir(tempDir);
      idIndexer = createIndexer(tempDir, fileSystem, logger);
      agent = createAgentWithKMS(tempDir, effectiveLogger);
      break;
    }

    default:
      throw new Error(`Unsupported storage type: ${storageType}`);
  }

  /* 
  const fileSystem = storageType === StorageType.FILE ? new NodeFileSystem() : new MemFileSystem();
  const vcStore = new FileVCStore(path.join(storeDir, "credentials"), fileSystem);

  const vcService = new VCService(
    agent, 
    vcStore,
    { defaultIssuerDid: options.defaultIssuerDid },
    effectiveLogger
  ); */

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
export function createVCService(
  storageType: StorageType = StorageType.FILE,
  options: VCServiceOptions & { storeDir?: string } = {},
  logger?: Logger,
): VCService {
  const effectiveLogger = logger || getNullLogger();
  const storeDir =
    options.storeDir || path.join(os.homedir(), ".synet", "identity");
  const agent = createAgentWithKMS(storeDir, effectiveLogger);

  // Set up storage based on type
  let storage: IStorage<W3CVerifiableCredential>;

  if (storageType === StorageType.FILE) {
    const fileSystem = new NodeFileSystem();
    fileSystem.ensureDirSync(storeDir);
    storage = new FileVCStore(path.join(storeDir, "credentials"), fileSystem);
  } else {
    const fileSystem = new MemFileSystem();
    const tempDir = "/tmp/.synet/identity";
    fileSystem.ensureDir(tempDir);
    storage = new FileVCStore(path.join(tempDir, "credentials"), fileSystem);
  }

  return new VCService(agent, storage, options, effectiveLogger);
}

function createAgentWithKMS(
  storeDir: string,
  logger?: Logger,
): TAgent<IKeyManager & IDIDManager & ICredentialPlugin> {
  const keyStorePath = path.join(storeDir, "keystore.json");
  const privateKeyStorePath = path.join(storeDir, "private-keystore.json");
  const didStorePath = path.join(storeDir, "didstore.json");

  return createAgent<IKeyManager & IDIDManager & ICredentialPlugin>({
    plugins: [
      new KeyManager({
        store: new FileKeyStore(keyStorePath),
        kms: {
          local: new KeyManagementSystem(
            new FilePrivateKeyStore(privateKeyStorePath),
          ),
        },
      }),
      new DIDManager({
        store: new FileDIDStore(didStorePath),
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
