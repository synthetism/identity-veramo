import type { CommandHandler } from '@synet/patterns';
import type { IVaultOperator } from '@synet/vault-core';
import type {Logger} from '@synet/logger';
import { IdentityVault } from '@synet/vault-core';

export class StoreCredentialHandler implements CommandHandler<StoreCredentialCommand, void> {
  constructor(
    private vaultOperator: IVaultOperator,
    private logger?: Logger
  ) {}

  async handle(command: StoreCredentialCommand): Promise<void> {
    const vaultId = command.vaultId || this.vaultOperator.getCurrentVaultId();
    
    if (!vaultId) {
      throw new Error('No vault specified and no active vault');
    }

    const vaultResult = await this.vaultOperator.getVault(vaultId);
    if (!vaultResult.isSuccess) {
      throw new Error(`Failed to get vault: ${vaultResult.errorMessage}`);
    }

    const vault = vaultResult.value;
    const updatedVault = IdentityVault.create({
      ...vault.toDomain(),
      vcStore: [...vault.vcStore, command.credential]
    });

    if (!updatedVault.isSuccess) {
      throw new Error(`Failed to create updated vault: ${updatedVault.errorMessage}`);
    }

    await this.vaultOperator.updateVault(updatedVault.value);
  }
}