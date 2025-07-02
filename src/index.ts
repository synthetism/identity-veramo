import { getNullLogger, type Logger } from "@synet/logger";

/* Storage */
import { NodeFileSystem as FileSystemSync } from "@synet/fs";
import { NodeFileSystem as FileSystemAsync } from "@synet/fs/promises";

/* Services */
import type { IVCService } from "./shared/provider";


import {
  IdentityService,
  type IdentityServiceOptions,
} from "./services/identity-service";

import path from "node:path";
import os from "node:os";
import { createVault, type Vault } from "./vault";

// Export file system implementations
export * from "./services/identity-service";

export type { IIdentifier, IKey, DIDDocument, W3CVerifiableCredential, VerifiableCredential, IssuerType } from "@veramo/core";

export enum StorageType {
  FILE = "file",
  ENCRYPTED = "encrypted", // Future: Implement encrypted storage
  CLOUD = "cloud",
}
import {createVeramoProvider} from "./providers/verano";
import { MemFileSystem } from "./shared/filesystem/memory";



/**
 * Create an identity service with vault-based storage
 */
export function createIdentityService(
  options: IdentityServiceOptions = {},
  logger?: Logger,
): IdentityService {

  const effectiveLogger = logger || getNullLogger();
  const storeDir = options.storeDir || path.join(os.homedir(), ".synet");
  const filesystemAsync = new FileSystemAsync();
  const veramoFilesystem = new FileSystemSync();

  const services = createVeramoProvider(
    { storeDir: storeDir },
    veramoFilesystem,
    effectiveLogger.child('Veramo'),
  );

  // Create vault system
  const vault = createVault(
    filesystemAsync,
    veramoFilesystem,
    {
      storeDir: storeDir
    },
    effectiveLogger.child('Vault')
  );


  const didService = services.didService;
  const keyService = services.keyService;
  const vcService = services.vcService;
 
  return new IdentityService(
    didService,
    keyService,
    vcService,
    vault.operator,
    {
      ...options,
    },
    effectiveLogger,
  );  
}

// Add a standalone function to create just the VC service with vault
// index.ts
export function createIdentityService(
  options: IdentityServiceOptions = {},
  logger?: Logger,
): IdentityService {
  // Setup dependencies
  const deps: Dependencies = {
    didService: services.didService,
    keyService: services.keyService,
    vcService: services.vcService,
    vaultOperator: vault.operator,
    logger
  };

  // Bootstrap use cases
  const app = makeAppUseCases(deps);

  // Return orchestrator service
  return new IdentityService(app, logger);
}

export function createCredentialService(
  options: CredentialServiceOptions = {},
  logger?: Logger,
): CredentialService {
  // Setup dependencies  
  const deps: Dependencies = {
    vcService: services.vcService,
    vaultOperator: vault.operator,
    logger
  };

  // Bootstrap use cases
  const app = makeAppUseCases(deps);

  // Return orchestrator service
  return new CredentialService(app, logger);
}