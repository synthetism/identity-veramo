import { EventEmitter, type Event } from '@synet/patterns';
import type { IFileSystem } from "./filesystem.interface";

export enum FilesystemEventTypes {
  EXISTS = 'file.exists',
  READ = 'file.read',
  WRITE = 'file.write',
  DELETE = 'file.delete',
  CHMOD = 'file.chmod',
  ENSURE_DIR = 'file.ensureDir',
  DELETE_DIR = 'file.deleteDir',
  READ_DIR = 'file.readDir',
}

export interface FilesystemEvent extends Event {
  type: FilesystemEventTypes;
  data: {
    filePath: string;
    operation: 'read' | 'write' | 'delete' | 'exists' | 'chmod' | 'ensureDir' | 'deleteDir' | 'readDir';
    result?: unknown;
    error?: Error;
  };
}

export class ObservableFileSystem implements IFileSystem {
  
  private eventEmitter: EventEmitter<FilesystemEvent>;
  
  constructor(
    private baseFilesystem: IFileSystem,
    private events?: FilesystemEventTypes[],
  ) {
    this.eventEmitter = new EventEmitter<FilesystemEvent>();
  }

  getEventEmitter(): EventEmitter<FilesystemEvent> {
    return this.eventEmitter;
  }
  
  private shouldEmit(eventType: FilesystemEventTypes): boolean {
    return !this.events || this.events.includes(eventType);
  }

  async exists(filename: string): Promise<boolean> {
    try {
      const result = await this.baseFilesystem.exists(filename);
      
      if (this.shouldEmit(FilesystemEventTypes.EXISTS)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.EXISTS,
          data: {
            filePath: filename,
            operation: 'exists',
            result
          }
        });
      }
      
      return result;
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.EXISTS)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.EXISTS,
          data: {
            filePath: filename,
            operation: 'exists',
            error: error as Error
          }
        });
      }
      throw error;
    }
  }

  async readFile(filename: string): Promise<string> {
    try {
      const content = await this.baseFilesystem.readFile(filename);
      
      if (this.shouldEmit(FilesystemEventTypes.READ)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.READ,
          data: {
            filePath: filename,
            operation: 'read',
            result: content.length
          }
        });
      }

      return content;
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.READ)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.READ,
          data: {
            filePath: filename,
            operation: 'read',
            error: error as Error
          }
        });
      }
      throw error;
    }
  }

  async writeFile(filename: string, data: string): Promise<void> {
    try {
      await this.baseFilesystem.writeFile(filename, data);

      if (this.shouldEmit(FilesystemEventTypes.WRITE)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.WRITE,
          data: {
            filePath: filename,
            operation: 'write',
            result: data.length
          }
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.WRITE)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.WRITE,
          data: {
            filePath: filename,
            operation: 'write',
            error: error as Error
          }
        });
      }
      throw error;
    }
  }

  async deleteFile(filename: string): Promise<void> {
    try {
      await this.baseFilesystem.deleteFile(filename);

      if (this.shouldEmit(FilesystemEventTypes.DELETE)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.DELETE,
          data: {
            filePath: filename,
            operation: 'delete'
          }
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.DELETE)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.DELETE,
          data: {
            filePath: filename,
            operation: 'delete',
            error: error as Error
          }
        });
      }
      throw error;
    }
  }
  
  async deleteDir(dirPath: string): Promise<void> {
    try {
      await this.baseFilesystem.deleteDir(dirPath);

      if (this.shouldEmit(FilesystemEventTypes.DELETE_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.DELETE_DIR,
          data: {
            filePath: dirPath,
            operation: 'deleteDir'
          }
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.DELETE_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.DELETE_DIR,
          data: {
            filePath: dirPath,
            operation: 'deleteDir',
            error: error as Error
          }
        });
      }
      throw error;
    }
  }

  async ensureDir(dirPath: string): Promise<void> {
    try {
      await this.baseFilesystem.ensureDir(dirPath);

      if (this.shouldEmit(FilesystemEventTypes.ENSURE_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.ENSURE_DIR,
          data: {
            filePath: dirPath,
            operation: 'ensureDir'
          }
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.ENSURE_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.ENSURE_DIR,
          data: {
            filePath: dirPath,
            operation: 'ensureDir',
            error: error as Error
          }
        });
      }
      throw error;
    }
  }

  async readDir(dirPath: string): Promise<string[]> {
    try {
      const result = await this.baseFilesystem.readDir(dirPath);

      if (this.shouldEmit(FilesystemEventTypes.READ_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.READ_DIR,
          data: {
            filePath: dirPath,
            operation: 'readDir',
            result: result.length
          }
        });
      }

      return result;
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.READ_DIR)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.READ_DIR,
          data: {
            filePath: dirPath,
            operation: 'readDir',
            error: error as Error
          }
        });
      }
      throw error;
    }
  }

  async chmod(path: string, mode: number): Promise<void> {
    try {
      await this.baseFilesystem.chmod(path, mode);

      if (this.shouldEmit(FilesystemEventTypes.CHMOD)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.CHMOD,
          data: {
            filePath: path,
            operation: 'chmod',
            result: mode
          }
        });
      }
    } catch (error) {
      if (this.shouldEmit(FilesystemEventTypes.CHMOD)) {
        this.eventEmitter.emit({
          type: FilesystemEventTypes.CHMOD,
          data: {
            filePath: path,
            operation: 'chmod',
            error: error as Error
          }
        });
      }
      throw error;
    }
  }

  async clear?(dirPath: string): Promise<void> {
    if (this.baseFilesystem.clear) {
      await this.baseFilesystem.clear(dirPath);
      // We could emit a clear event, but it's not in our enum
      // Could be added if needed
    }
  }
}
