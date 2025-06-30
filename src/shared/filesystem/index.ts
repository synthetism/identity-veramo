// @synet/identity/src/shared/filesystem/index.ts

// Synchronous implementations
export { IFileSystem } from './filesystem.interface';
export { NodeFileSystem } from './filesystem';
export { MemFileSystem } from './memory';
export { 
  ObservableFileSystem, 
  FilesystemEventTypes, 
  type FilesystemEvent 
} from './observable';

// Asynchronous implementations
export { IFileSystem as IAsyncFileSystem } from './promises/filesystem.interface';
export { NodeFileSystem as AsyncNodeFileSystem } from './promises/filesystem';
export { MemFileSystem as AsyncMemFileSystem } from './promises/memory';
export { 
  ObservableFileSystem as AsyncObservableFileSystem,
  FilesystemEventTypes as AsyncFilesystemEventTypes,
  type FilesystemEvent as AsyncFilesystemEvent
} from './promises/observable';
