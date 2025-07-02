import { getNullLogger, type Logger } from "@synet/logger";

/* Storage */
import { NodeFileSystem as FileSystemSync } from "@synet/fs";
import { NodeFileSystem as FileSystemAsync } from "@synet/fs/promises";

/* Services */
import {
  IdentityService,
  type IdentityServiceOptions,
} from "./services/identity-service";
import { CredentialService } from "./services/credential-service";
import { DidService } from "./services/did-service";
import { KeyService } from "./services/key-service";

/* Use Cases */
import type { Dependencies } from "./application/common/types/dependencies";
import { makeUseCases } from "./application/use-cases";

import path from "node:path";
import os from "node:os";
import { createVault, type Vault } from "./vault";
import {createVeramoProvider} from "./providers/verano";
// Export file system implementations
export * from "./services/identity-service";
export * from "./services/credential-service";
export * from "./services/did-service";
export * from "./services/key-service";

export type { IIdentifier, IKey, DIDDocument, W3CVerifiableCredential, VerifiableCredential, IssuerType } from "@veramo/core";

export enum StorageType {
  FILE = "file",
  ENCRYPTED = "encrypted", // Future: Implement encrypted storage
  CLOUD = "cloud",
}

function makeDependencies(
  options?: IdentityServiceOptions, 
  logger?: Logger,
): Dependencies {

   const effectiveLogger = logger || getNullLogger();
   const storeDir = options?.storeDir || path.join(os.homedir(), ".synet");
   const filesystemAsync = new FileSystemAsync();
   const veramoFilesystem = new FileSystemSync();

   const services = createVeramoProvider(
      { storeDir: storeDir },
      veramoFilesystem,
      logger?.child('Veramo').child('KeyService'),
    )
   
    const vault = createVault(
    filesystemAsync,
    veramoFilesystem,
    {
      storeDir: storeDir
    },
    effectiveLogger.child('Vault')
    );

    const deps: Dependencies = {
    didService: services.didService,
    keyService: services.keyService,
    vcService: services.vcService,
    privateKeyService: services.privateKeyService,
    vaultOperator: vault.operator,
    logger: effectiveLogger
  };


    return deps;

  };

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

  // Setup dependencies
  const deps: Dependencies = {
    didService: services.didService,
    keyService: services.keyService,
    vcService: services.vcService,
    privateKeyService: services.privateKeyService,
    vaultOperator: vault.operator,
    logger: effectiveLogger
  };

  // Bootstrap use cases
  const useCases = makeUseCases(deps);

  // Return orchestrator service
  return new IdentityService(useCases, vault.operator, options, effectiveLogger);
}

/**
 * Create a credential service with vault-based storage
 * @deprecated Use createCredentialService instead
 */
export function createVCService(
  options: IdentityServiceOptions = {},
  logger?: Logger,
): CredentialService {
  return createCredentialService(options, logger);
}

/**
 * Create a credential service with vault-based storage
 */
export function createCredentialService(
  options: IdentityServiceOptions = {},
  logger?: Logger,
): CredentialService {
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

  // Setup dependencies
  const deps: Dependencies = {
    didService: services.didService,
    keyService: services.keyService,
    vcService: services.vcService,
    privateKeyService: services.privateKeyService,
    vaultOperator: vault.operator,
    logger: effectiveLogger
  };

  // Bootstrap use cases
  const useCases = makeUseCases(deps);

  // Return orchestrator service
  return new CredentialService(useCases,vault.operator, effectiveLogger);
}

/**
 * Create a DID service with vault-based storage
 */
export function createDidService(
  options: IdentityServiceOptions = {},
  logger?: Logger,
): DidService {
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

  // Setup dependencies
  const deps: Dependencies = {
    didService: services.didService,
    keyService: services.keyService,
    vcService: services.vcService,
    privateKeyService: services.privateKeyService,
    vaultOperator: vault.operator,
    logger: effectiveLogger
  };

  // Bootstrap use cases
  const useCases = makeUseCases(deps);

  // Return orchestrator service
  return new DidService(useCases, effectiveLogger);
}

/**
 * Create a key service with vault-based storage
 */
export function createKeyService(
  options: IdentityServiceOptions = {},
  logger?: Logger,
): KeyService {
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

  // Setup dependencies
  const deps: Dependencies = {
    didService: services.didService,
    keyService: services.keyService,
    vcService: services.vcService,
    privateKeyService: services.privateKeyService,
    vaultOperator: vault.operator,
    logger: effectiveLogger
  };

  // Bootstrap use cases
  const useCases = makeUseCases(deps);

  // Return orchestrator service
  return new KeyService(useCases, effectiveLogger);
}