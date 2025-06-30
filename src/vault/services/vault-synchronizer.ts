import type { 
  IdentityVault, 
  IVaultStorage,
  VaultEvent, 
  FileChangedEvent,
  AdapterData
} from "@synet/vault-core";
import type {ManagedPrivateKey} from "@synet/identity-core";
import { vaultEventService, VaultEventType } from "@synet/vault-core";
import type { Logger } from "@synet/logger";
import path from "node:path";
import { Result } from "@synet/patterns";
import type { EventObserver, Event } from "@synet/patterns";
import type { IAsyncFileSystem } from "@synet/patterns/fs/promises";
import chalk from "chalk";
import { VaultId } from "../domain/value-objects/vault-id";
/**
 * VaultSynchronizer
 * 
 * Listens for filesystem changes from adapters and synchronizes data with vault
 */
export class VaultSynchronizer implements EventObserver<VaultEvent>  {
  private activeVaultId: string | null = null;
  private updateQueues: Record<string, Promise<void>> = {};

  private knownFiles = {
    didStore: "didstore.json", 
    keyStore: "keystore.json",
    privateKeyStore: "private-keystore.json",
    vcStore: "vcstore.json"
  };

  constructor(
    private filesystem: IAsyncFileSystem,
    private vaultStorage: IVaultStorage,   
    private baseDir: string,
    private logger?: Logger
  ) {

    //const eventEmitter = vaultEventService.getEventEmitter();
    //eventEmitter.subscribe(VaultEventType.FILE_CHANGED, this);

  }

  update(event: VaultEvent): void {
    
    if (event.type === VaultEventType.FILE_CHANGED) {
      this.handleFileChange(event as FileChangedEvent).then(() => {
        this.logger?.info(`Handled file change event ${chalk.bold(event.type)} path ${event.payload.filePath} with operation ${event.payload.operation} for vault ${event.payload.vaultId}`);
      }).catch((error) => {
        this.logger?.error(`Error handling file change event: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  }

    // Get the directory for a specific vault
  getVaultDir(vaultId: string): string {
    return path.join(this.baseDir, vaultId);
  }

  private async handleFileChange(event: FileChangedEvent): Promise<void> {
    // Only process writes
    if (event.payload.operation !== 'write') return;
    
    const filePath = event.payload.filePath;
    const rawVaultId = event.payload.vaultId;
    
     const vaultIdResult = VaultId.create(rawVaultId);
    if (!vaultIdResult.isSuccess || !vaultIdResult.value) {
      this.logger?.error(`Invalid vault ID in event: ${rawVaultId}`);
      return;
    }
    
    const vaultId = vaultIdResult.value.toString();

    const filename = path.basename(filePath);
    this.logger?.debug(`File change detected for vault ${vaultId}: ${filename}`);

    // Map the filename to the corresponding section
    let section: keyof IdentityVault | null = null;
    
    if (filename === this.knownFiles.didStore) {
      section = 'didStore';
    } else if (filename === this.knownFiles.keyStore) {
      section = 'keyStore';
    } else if (filename === this.knownFiles.privateKeyStore) {
      section = 'privateKeyStore';
    } else if (filename === this.knownFiles.vcStore) {
      section = 'vcStore';
    }

    if (!section) {
      this.logger?.debug(`Ignoring unknown file: ${filename}`);
      return;
    }

  // Update the vault with the new data
    this.logger?.warn(`Starting sync for section ${section} from file ${filePath}`);

    //await this.syncSection(section, filePath);
    //Update the vault with the new data
   this.syncSection(section, filePath).then(() => {
      this.logger?.debug(`Successfully synced section ${section} from file ${filePath}`);
    }).catch((error) => {
      this.logger?.error(`Error syncing section ${section} from file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    });
  }


private async syncSection(section: keyof IdentityVault, filePath: string): Promise<void> {
  if (!this.activeVaultId) return;
  const activeVaultId = this.activeVaultId.toString();
  

  // Simpler queue initialization and management
  this.updateQueues[activeVaultId] = (this.updateQueues[activeVaultId] || Promise.resolve())
    .then(() => this.processSectionUpdate(section, filePath, activeVaultId))
    .catch(error => {
      this.logger?.error(`Queue error for vault ${activeVaultId}: ${error}`);
    });
  
  return this.updateQueues[activeVaultId];
}

// Extract the core processing logic to a separate method
private async processSectionUpdate(
  section: keyof IdentityVault, 
  filePath: string,
  vaultId: string
): Promise<void> {
  // Get current data
  const vault = await this.vaultStorage.get(vaultId);
  if (!vault) {
    throw new Error(`Vault ${vaultId} not found`);
  }
  
  // Read and parse file
  const content = await this.filesystem.readFile(filePath);
  if (!content) return;
  
  const parsedData = JSON.parse(content);
  const dataArray = Object.values(parsedData);
  
  const vaultVO = VaultId.create(vaultId);

  if(!vaultVO.isSuccess || !vaultVO.value) {
    throw new Error(`Invalid vault ID: ${vaultId}`);
  }
  // Create targeted update
  const update: IdentityVault = { 
    id: vaultVO.value,
    [section]: dataArray 
  } as unknown as IdentityVault;

  
  // Update only this section
  await this.vaultStorage.update(vaultId, update);
  this.logger?.debug(`Updated vault ${vaultId} section ${section} with ${dataArray.length} items`);
}
  /**
   * Seed data files from vault when changing active vault
   */
  async seedFilesFromVault(vaultId: string): Promise<Result<void>> {
    try {
      // Check if vault exists
       // Check if vault exists
      if (!await this.vaultStorage.exists(vaultId)) {
        return Result.fail(`Vault with ID ${vaultId} does not exist`);
      }

      // Get vault-specific directory
      const vaultDir = this.getVaultDir(vaultId);
      
      // Check if already seeded
      const didStorePath = path.join(vaultDir, this.knownFiles.didStore);
      if (await this.filesystem.exists(didStorePath)) {
        this.logger?.debug(`Vault ${vaultId} already seeded, skipping`);
        this.activeVaultId = vaultId; // Set active vault ID
        return Result.success(undefined);
      }

      // Load vault data
      const vault = await this.vaultStorage.get(vaultId);
      
      // Ensure directory exists
      await this.filesystem.ensureDir(vaultDir);

      // Define paths with vault directory
      const keyStorePath = path.join(vaultDir, this.knownFiles.keyStore);
      const privateKeyStorePath = path.join(vaultDir, this.knownFiles.privateKeyStore);
      const vcStorePath = path.join(vaultDir, this.knownFiles.vcStore);
            
 
      // Create adapter data structure
      const adapterData: AdapterData = {
        dids: {},
        keys: {},
        privateKeys: {},
        vcs: {}
      };

      // Map DID array to object
      if (vault.didStore && vault.didStore.length > 0) {
        for (const did of vault.didStore) {
          adapterData.dids[did.did] = did;
        }
        await this.filesystem.writeFile(didStorePath, JSON.stringify(adapterData.dids, null, 2));
        this.logger?.debug(`Seeded didstore.json with ${vault.didStore.length} DIDs`);
      } else {
        // Write empty object
        await this.filesystem.writeFile(didStorePath, "{}");
      }

      // Map Key array to object
      if (vault.keyStore && vault.keyStore.length > 0) {
        for (const key of vault.keyStore) {
          adapterData.keys[key.kid] = key;
        }
        await this.filesystem.writeFile(keyStorePath, JSON.stringify(adapterData.keys, null, 2));
        this.logger?.debug(`Seeded keystore.json with ${vault.keyStore.length} keys`);
      } else {
        await this.filesystem.writeFile(keyStorePath, "{}");
      }

      // Map private key array to object
      if (vault.privateKeyStore && vault.privateKeyStore.length > 0) {
        for (const key of vault.privateKeyStore) {
          // For private keys, use alias as the key

          const keyWithAlias = key as ManagedPrivateKey; // TypeScript workaround
          if (keyWithAlias?.alias) {
            adapterData.privateKeys[keyWithAlias.alias] = keyWithAlias;
          }
        }
        await this.filesystem.writeFile(privateKeyStorePath, JSON.stringify(adapterData.privateKeys, null, 2));
        this.logger?.debug(`Seeded private-keystore.json with ${vault.privateKeyStore.length} private keys`);
      } else {
        await this.filesystem.writeFile(privateKeyStorePath, "{}");
      }

      // Map VCs array to object
      if (vault.vcStore && vault.vcStore.length > 0) {
        for (const vc of vault.vcStore) {
          // Extract ID from VC
          if (vc.id) {
            const vcId = vc.id.split(':').pop() || vc.id;
            adapterData.vcs[vcId] = vc;
          }
        }
        await this.filesystem.writeFile(vcStorePath, JSON.stringify(adapterData.vcs, null, 2));
        this.logger?.debug(`Seeded vcstore.json with ${vault.vcStore.length} VCs`);
      } else {
        await this.filesystem.writeFile(vcStorePath, "{}");
     }
      // Set active vault ID
      this.activeVaultId = vaultId;
      return Result.success(undefined);
    } catch (error) {
      this.logger?.error(`Error seeding files from vault: ${error}`);
      return Result.fail(`Failed to seed files from vault: ${error}`);
    }
  }

  /**
   * Set active vault for synchronization
   */
  setActiveVault(vaultId: string | null): void {
    if (!vaultId) {
      this.activeVaultId = null;
      this.logger?.debug('Active vault set to: none');
      return;
    }
    this.activeVaultId = vaultId;
    this.logger?.debug(`Active vault set to: ${vaultId || 'none'}`);
  }

  /**
   * Clean up event listeners
   */
  dispose(): void {
    const eventEmitter = vaultEventService.getEventEmitter();
    eventEmitter.unsubscribe(VaultEventType.FILE_CHANGED, this);
  }
}