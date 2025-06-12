import {
  createAgent,
  type IKeyManager,
  type IDIDManager,
  type TAgent,
} from "@veramo/core";
import { KeyManager } from "@veramo/key-manager";
import { KeyManagementSystem } from "@veramo/kms-local";
import { DIDManager } from "@veramo/did-manager";
import { KeyDIDProvider } from "@veramo/did-provider-key";
import { getNullLogger, type Logger } from "@synet/logger";
import { createIndexer } from "./infrastructure/indexer/indexer-factory";
import { NodeFileSystem } from "./infrastructure/filesystem/filesystem";
import { MemFileSystem } from "./infrastructure/filesystem/memory";
import { VeramoDidStore } from "./infrastructure/stores/did-store";
import { VeramoKeyStore } from "./infrastructure/stores/key-store";
import {
  IdentityService,
  type IdentityServiceOptions,
} from "./application/service/identity-service";

import path from "node:path";
import os from "node:os";

// Export domain entities, interfaces and common utilities
export * from "./domain/common/indexer";

export * from "./domain/interfaces/filesystem.interface";
export * from "./domain/interfaces/indexer.interface";

// Export file system implementations
export * from "./infrastructure/filesystem/filesystem";
export * from "./infrastructure/filesystem/memory";

// Export store interfaces
export * from "./infrastructure/stores/did-store";
export * from "./infrastructure/stores/key-store";

import * as file from "./infrastructure/adapters/veramo";

import type { IIndexer } from "./domain/interfaces/indexer.interface";

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
    let agent: TAgent<IKeyManager & IDIDManager>;
    let idIndexer: IIndexer;

  switch (storageType) {
    case StorageType.FILE: {
      const fileSystem = new NodeFileSystem();
      fileSystem.ensureDirSync(storeDir);
      idIndexer = createIndexer(storeDir, fileSystem, logger);

      const keyStorePath = path.join(storeDir, "keystore.json");
      const privateKeyStorePath = path.join(storeDir, "private-keystore.json");
      const didStorePath = path.join(storeDir, "didstore.json");

      agent = createAgent<IKeyManager & IDIDManager>({
        plugins: [
          new KeyManager({
            store: new file.FileKeyStore(keyStorePath),
            kms: {
              local: new KeyManagementSystem(
                new file.FilePrivateKeyStore(privateKeyStorePath),
              ),
            },
          }),
          new DIDManager({
            store: new file.FileDIDStore(didStorePath),
            defaultProvider: "did:key",
            providers: {
              "did:key": new KeyDIDProvider({
                defaultKms: "local",
              }),
            },
          }),
        ],
      });
      break;
    }

    case StorageType.MEMORY: {
      const fileSystem = new MemFileSystem();
      const tempDir = "/tmp/.synet/identity";
      fileSystem.ensureDir(tempDir);
      idIndexer = createIndexer(storeDir, fileSystem, logger);
      const keyStorePath = path.join(tempDir, "keystore.json");
      const privateKeyStorePath = path.join(tempDir, "private-keystore.json");
      const didStorePath = path.join(tempDir, "didstore.json");

      agent = createAgent<IKeyManager & IDIDManager>({
        plugins: [
          new KeyManager({
            store: new file.FileKeyStore(keyStorePath),
            kms: {
              local: new KeyManagementSystem(
                new file.FilePrivateKeyStore(privateKeyStorePath),
              ),
            },
          }),
          new DIDManager({
            store: new file.FileDIDStore(didStorePath),
            defaultProvider: "did:key",
            providers: {
              "did:key": new KeyDIDProvider({
                defaultKms: "local",
              }),
            },
          }),
        ],
      });
      break;
    }

    case StorageType.ENCRYPTED:
      // Future: Implement encrypted storage
      throw new Error("Encrypted storage not yet implemented");

    default:
      throw new Error(`Unsupported storage type: ${storageType}`);
  }

  const didStore = new VeramoDidStore(agent, effectiveLogger);
  const keyStore = new VeramoKeyStore(agent, effectiveLogger);

  return new IdentityService(
    didStore,
    keyStore,
    idIndexer,
    options,
    effectiveLogger,
  );
}
