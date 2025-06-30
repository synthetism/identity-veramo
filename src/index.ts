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
    effectiveLogger
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
export function createVCService(
  options: IdentityServiceOptions & { storeDir?: string } = {},
  logger?: Logger,
): IVCService {
  const effectiveLogger = logger || getNullLogger();
  const storeDir = options.storeDir || path.join(os.homedir(), ".synet");      
  const filesystem = new MemFileSystem();

  const services = createVeramoProvider(
    { storeDir: storeDir },
    filesystem,
    effectiveLogger.child('Veramo'),
  );

  return services.vcService;
}
