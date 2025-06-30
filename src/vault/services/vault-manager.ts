import {Result} from '@synet/patterns';
import type { IVaultManager, IdentityVault, IVaultStorage } from '@synet/vault-core';
import type { Logger } from "@synet/logger";
import type { SynetVerifiableCredential, BaseCredentialSubject } from '@synet/credentials';
import type { ManagedPrivateKey, IIdentifier, IKey } from "@synet/identity-core";
import { vaultContext }  from "@synet/vault-core";

export class VaultManager implements IVaultManager {

    private vaultId: string;

    constructor(
        private vaultStorage: IVaultStorage,
        private logger? : Logger,
    ) {
      this.vaultId = '';

      vaultContext.onVaultChange((data: { previous: string | null, current: string | null }) => {
        if (data.current) {
          this.vaultId = data.current;
          this.logger?.info(`Active vault changed from ${data.previous || 'none'} to: ${data.current}`);
        } else {
          this.vaultId = '';
          this.logger?.info('No vault is currently active');
        }
      });
      
    }
    
    async use(vaultId: string): Promise<Result<void>> {
      try { 
        if (!await this.vaultStorage.exists(vaultId)) {
          return Result.fail(`Vault with ID ${vaultId} does not exist.`);
        }

        this.vaultId = vaultId;
        return Result.success(undefined);

      } catch (error: unknown) {
        this.logger?.error(`Error using vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return Result.fail(`Failed to use vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    getCurrentVaultId(): string {
      return this.vaultId;
    }

    hasActiveVault(): boolean {
      return !!this.vaultId;
    }

    private async ensureVaultExists(): Promise<void> {
      if (!this.vaultId) {
        throw new Error('No vault is currently selected. Call use() first.');
      }
    }

    // Generic methods for section-based storage
    async saveSection<T >(sectionKey: keyof IdentityVault, data: T): Promise<void> {
      await this.ensureVaultExists();
      
      try {
        const vault = await this.vaultStorage.get(this.vaultId) as IdentityVault;
        (vault as Record<keyof IdentityVault, unknown>)[sectionKey] = data;
        await this.vaultStorage.update(this.vaultId, vault);
      } catch (error: unknown) {
        this.logger?.error(`Error saving section ${String(sectionKey)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }

    async loadSection<T>(sectionKey: keyof IdentityVault): Promise<T | undefined> {
      await this.ensureVaultExists();
      
      try {
        const vault = await this.vaultStorage.get(this.vaultId) as IdentityVault;
        return vault[sectionKey] as T;
      } catch (error: unknown) {
        this.logger?.error(`Error loading section ${String(sectionKey)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return undefined;
      }
    }

    // Specialized methods for each store type
    async saveDIDs(dids: Record<string, IIdentifier>): Promise<void> {
      await this.saveSection<IIdentifier[]>('didStore', Object.values(dids));
    }

    async loadDIDs(): Promise<Record<string, IIdentifier>> {
      const didArray = await this.loadSection<IIdentifier[]>('didStore');
      if (!didArray) return {};
      
      const didMap: Record<string, IIdentifier> = {};
      for (const did of didArray) {
        didMap[did.did] = did;
      }
      return didMap;
    }

    async saveKeys(keys: Record<string, IKey>): Promise<void> {
      await this.saveSection('keyStore', Object.values(keys));
    }

    async loadKeys(): Promise<Record<string, IKey>> {
      const keyArray = await this.loadSection<IKey[]>('keyStore');
      if (!keyArray) return {};
      
      const keyMap: Record<string, IKey> = {};
      for (const key of keyArray) {
        keyMap[key.kid] = key;
      }
      return keyMap;
    }

    async savePrivateKeys(keys: Record<string, ManagedPrivateKey>): Promise<void> {
      await this.saveSection('privateKeyStore', Object.values(keys));
    }

    async loadPrivateKeys(): Promise<Record<string, ManagedPrivateKey>> {
      const keyArray = await this.loadSection<ManagedPrivateKey[]>('privateKeyStore');
      if (!keyArray) return {};
      
      const keyMap: Record<string, ManagedPrivateKey> = {};
      for (const key of keyArray) {
        keyMap[key.alias] = key;
      }
      return keyMap;
    }

    async saveVCs(vcs: Record<string, SynetVerifiableCredential<BaseCredentialSubject>>): Promise<void> {
      await this.saveSection('vcStore', Object.values(vcs));
    }

    async loadVCs(): Promise<Record<string, SynetVerifiableCredential<BaseCredentialSubject>>> {
      const vcArray = await this.loadSection<SynetVerifiableCredential<BaseCredentialSubject>[]>('vcStore');
      if (!vcArray) return {};
      
      const vcMap: Record<string, SynetVerifiableCredential<BaseCredentialSubject>> = {};
      for (const vc of vcArray) {
        if (vc.id) {
          // Use the last part of the ID as the key (alias)
          const alias = vc.id.split(':').pop() || vc.id;
          vcMap[alias] = vc;
        }
      }
      return vcMap;
    }
}