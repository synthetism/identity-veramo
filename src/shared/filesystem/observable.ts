import type { IFileSystem } from "./filesystem.interface";
import { fileSystemChangeEmitter, type FileChangeEvent } from "@synet/vault-core";
import type { Logger } from "@synet/logger";

/**
 * Observable filesystem wrapper that emits events on file operations
 */
export class ObservableFileSystem implements IFileSystem {
  constructor(
    private baseFileSystem: IFileSystem,
    private eventEmitter: typeof fileSystemChangeEmitter,
    private logger?: Logger
  ) {}

  existsSync(path: string): boolean {
    return this.baseFileSystem.existsSync(path);
  }

  readFileSync(path: string): string {
    const content = this.baseFileSystem.readFileSync(path);
    
    // Emit read event
    this.eventEmitter.emitChange({
      filePath: path,
      type: 'read'
    });
    
    return content;
  }

  writeFileSync(path: string, data: string): void {
    this.baseFileSystem.writeFileSync(path, data);
    
    // Emit write event
    fileSystemChangeEmitter.emitChange({
      filePath: path,
      type: 'write'
    });
    
    this.logger?.debug(`File written: ${path}`);
  }

  deleteFileSync(path: string): void {
    this.baseFileSystem.deleteFileSync(path);
    
    // Emit delete event
    fileSystemChangeEmitter.emitChange({
      filePath: path,
      type: 'delete'
    });
    
    this.logger?.debug(`File deleted: ${path}`);
  }

  deleteDirSync(path: string): void {
    this.baseFileSystem.deleteDirSync(path);
  }

  ensureDirSync(path: string): void {
    this.baseFileSystem.ensureDirSync(path);
  }

  readDirSync(dirPath: string): string[] {
    return this.baseFileSystem.readDirSync(dirPath);
  }

  chmodSync(path: string, mode: number): void {
    this.baseFileSystem.chmodSync(path, mode);
  }

  // If the base filesystem has a clear method, implement it
  clear(dirPath: string): void {
    if (this.baseFileSystem.clear) {
      this.baseFileSystem.clear(dirPath);
    }
  }
}