import { fileSystemChangeEmitter, type FileChangeEvent, type AdapterData } from "@synet/vault-core";
import type { 
  IdentityVault, 
  ManagedPrivateKey, 
  IVaultStorage,
  VaultEvent, 
  FileChangedEvent,
} from "@synet/vault-core";
import { vaultEventService, VaultEventType } from "@synet/vault-core";
import type { Logger } from "@synet/logger";
import path from "node:path";
import { Result } from "@synet/patterns";
import type { EventObserver, Event } from "@synet/patterns";
import type { IFileSystem } from "../../shared/filesystem/filesystem.interface";

/**
 * VaultSynchronizer
 * 
 * Listens for filesystem changes from adapters and synchronizes data with vault
 */
export class VaultSynchronizer implements EventObserver<VaultEvent>  {
  private activeVaultId: string | null = null;
  private knownFiles = {
    didStore: "didstore.json", 
    keyStore: "keystore.json",
    privateKeyStore: "private-keystore.json",
    vcStore: "vcstore.json"
  };

  constructor(
    private filesystem: IFileSystem,
    private vaultStorage: IVaultStorage,   
    private baseDir: string,
    private logger?: Logger
  ) {
    // Subscribe to filesystem events
    //fileSystemChangeEmitter.onFileChange(this.handleFileChange.bind(this));
    //this.logger?.debug('VaultSynchronizer initialized');
    const eventEmitter = vaultEventService.getEventEmitter();
    eventEmitter.subscribe(VaultEventType.FILE_CHANGED, this);

  }

  update(event: VaultEvent): void {
    if (event.type === VaultEventType.FILE_CHANGED) {
      this.handleFileChange(event as FileChangedEvent);
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
    const vaultId = event.payload.vaultId;
    
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
  this.logger?.debug(`Starting sync for section ${section} from file ${filePath}`);

    // Update the vault with the new data
    await this.syncSection(section, filePath);
  }



  // In VaultSynchronizer.ts
private async syncSection(section: keyof IdentityVault, filePath: string): Promise<void> {
  try {
    if (!this.activeVaultId) return;

    // Get current vault data
    const vault = await this.vaultStorage.get(this.activeVaultId);
    
    // Read the file content
    const content = this.filesystem.readFileSync(filePath);
    let parsedData: Record<string, any> = {};
    
    try {
      parsedData = JSON.parse(content);
    } catch (e) {
      this.logger?.error(`Failed to parse ${section} data: ${e}`);
      return;
    }

    // Convert object to array for storage
    const dataArray = Object.values(parsedData);
    
    this.logger?.debug(
      `Syncing ${dataArray.length} items from ${section} to vault ${this.activeVaultId}`
    );
    
    // Update the vault section with the correct type
    switch(section) {
      case 'didStore':
        vault.didStore = dataArray;
        break;
      case 'keyStore':
        vault.keyStore = dataArray;
        break;
      case 'privateKeyStore':
        vault.privateKeyStore = dataArray;
        break;
      case 'vcStore':
        vault.vcStore = dataArray;
        break;
      default:
        this.logger?.warn(`Unknown section: ${section}`);
        return;
    }

    // Save updated vault
    await this.vaultStorage.update(this.activeVaultId, vault);
    this.logger?.debug(
      `Updated vault ${this.activeVaultId} section ${String(section)} with ${dataArray.length} items`
    );
  } catch (error) {
    this.logger?.error(`Error syncing ${String(section)}: ${error instanceof Error ? error.message : String(error)}`);
  }
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
      if (this.filesystem.existsSync(didStorePath)) {
        this.logger?.debug(`Vault ${vaultId} already seeded, skipping`);
        this.activeVaultId = vaultId;
        return Result.success(undefined);
      }

      // Load vault data
      const vault = await this.vaultStorage.get(vaultId);
      
      // Ensure directory exists
      this.filesystem.ensureDirSync(vaultDir);
 
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
        this.filesystem.writeFileSync(didStorePath, JSON.stringify(adapterData.dids, null, 2));
        this.logger?.debug(`Seeded didstore.json with ${vault.didStore.length} DIDs`);
      } else {
        // Write empty object
        this.filesystem.writeFileSync(didStorePath, "{}");
      }

      // Map Key array to object
      if (vault.keyStore && vault.keyStore.length > 0) {
        for (const key of vault.keyStore) {
          adapterData.keys[key.kid] = key;
        }
        this.filesystem.writeFileSync(keyStorePath, JSON.stringify(adapterData.keys, null, 2));
        this.logger?.debug(`Seeded keystore.json with ${vault.keyStore.length} keys`);
      } else {
        this.filesystem.writeFileSync(keyStorePath, "{}");
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
        this.filesystem.writeFileSync(privateKeyStorePath, JSON.stringify(adapterData.privateKeys, null, 2));
        this.logger?.debug(`Seeded private-keystore.json with ${vault.privateKeyStore.length} private keys`);
      } else {
        this.filesystem.writeFileSync(privateKeyStorePath, "{}");
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
        this.filesystem.writeFileSync(vcStorePath, JSON.stringify(adapterData.vcs, null, 2));
        this.logger?.debug(`Seeded vcstore.json with ${vault.vcStore.length} VCs`);
      } else {
        this.filesystem.writeFileSync(vcStorePath, "{}");
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