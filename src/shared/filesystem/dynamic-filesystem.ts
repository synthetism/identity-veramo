// @synet/vault-core/src/filesystem/dynamic-filesystem.ts
import type { IFileSystem } from "@synet/patterns/filesystem";
import { vaultEventService } from "@synet/vault-core";
import path from "node:path";
import type { Logger } from "@synet/logger";

/**
 * A filesystem wrapper that dynamically routes operations to vault-specific folders
 */
export class DynamicVaultFilesystem implements IFileSystem {
  constructor(
    private baseFilesystem: IFileSystem,
    private baseDir: string,
    private logger?: Logger
  ) {}
  
  private getVaultDir(filename: string): string {
    const vaultId = vaultEventService.getActiveVaultId();
    if (!vaultId) {
      throw new Error('No active vault selected. Call VaultOperator.use() first.');
    }
    
    // Create path with vault ID as a subdirectory
    return path.join(this.baseDir, vaultId, filename);
  }
  
  existsSync  (filename: string): boolean {
    const fullPath = this.getVaultDir(filename);
    return this.baseFilesystem.existsSync(fullPath);
  }

  readFileSync(filename: string): string {
    const fullPath = this.getVaultDir(filename);
    const content = this.baseFilesystem.readFileSync(fullPath);

    const vaultId = vaultEventService.getActiveVaultId();
    if (!vaultId) {
      throw new Error('No active vault selected');
    }

    vaultEventService.emitFileChanged(
      fullPath, 
      vaultId, 
      'read'
    );
    
    return content;
  }

  writeFileSync(filename: string, data: string): void {
    const vaultId = vaultEventService.getActiveVaultId();
    if (!vaultId) {
      throw new Error('No active vault selected. Call VaultOperator.use() first.');
    }
    
    const vaultDir = path.join(this.baseDir, vaultId);
    
    // Ensure vault directory exists
    this.baseFilesystem.ensureDirSync(vaultDir);

    // Write file to vault-specific directory
    const fullPath = path.join(vaultDir, filename);
    this.baseFilesystem.writeFileSync(fullPath, data);

    // Emit event
    vaultEventService.emitFileChanged(fullPath, vaultId, 'write');
    
    this.logger?.debug(`File written: ${fullPath}`);
  }

  deleteFileSync(filename: string): void {
    const fullPath = this.getVaultDir(filename);
    this.baseFilesystem.deleteFileSync(fullPath);

    const vaultId = vaultEventService.getActiveVaultId();
    if (!vaultId) {
      throw new Error('No active vault selected');
    }
    
    vaultEventService.emitFileChanged(
      fullPath, 
      vaultId, 
      'delete'
    );
  }
  
  // Implement other filesystem methods similarly
  deleteDirSync(dirPath: string): void {

     const vaultId = vaultEventService.getActiveVaultId();
     if (!vaultId) {
      throw new Error('No active vault selected');
    }

    if (dirPath === '') {
      const vaultDir = path.join(this.baseDir, vaultId);
      this.baseFilesystem.deleteDirSync(vaultDir);
    } else {
      const fullPath = this.getVaultDir(dirPath);
      this.baseFilesystem.deleteDirSync(fullPath);
    }
  }

  ensureDirSync(dirPath: string): void {

    const vaultId = vaultEventService.getActiveVaultId();
    if (!vaultId) {
      throw new Error('No active vault selected');  
    }

    if (dirPath === '') {
      const vaultDir = path.join(this.baseDir, vaultId);
      this.baseFilesystem.ensureDirSync(vaultDir);
    } else {
      const fullPath = this.getVaultDir(dirPath);
      this.baseFilesystem.ensureDirSync(fullPath);
    }
  }

  readDirSync(dirPath: string): string[] {

    const vaultId = vaultEventService.getActiveVaultId();
    if (!vaultId) {
      throw new Error('No active vault selected');
    }

    if (dirPath === '') {
      const vaultDir = path.join(this.baseDir, vaultId);
      return this.baseFilesystem.readDirSync(vaultDir);
    }

    const fullPath = this.getVaultDir(dirPath);
    return this.baseFilesystem.readDirSync(fullPath);

  }

  chmodSync(path: string, mode: number): void {
    try {
      this.baseFilesystem.chmodSync(path, mode);
    } catch (error) {
      throw new Error(`Failed to change permissions for ${path}: ${error}`);
    }
  }
  
  // Implement other methods as needed
}