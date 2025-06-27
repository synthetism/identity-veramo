import { fs as memfs } from "memfs";
import type { IFileSystem } from "./filesystem.interface";

/**
 * In-memory file system implementation using memfs
 */
export class MemFileSystem implements IFileSystem {
  
  existsSync(path: string): boolean {
    try {
      memfs.statSync(path);
      return true;
    } catch {
      return false;
    }
  }
 
  readFileSync(path: string): string {
    try {
      const buffer = memfs.readFileSync(path);
      return buffer.toString("utf8");
    } catch (error) {
      throw new Error(`Failed to read file ${path}: ${error}`);
    }
  }

  

  writeFileSync(path: string, data: string): void {
    try {
      // Ensure the directory exists before writing
      const dirPath = path.substring(0, path.lastIndexOf("/"));
      if (dirPath && !this.existsSync(dirPath)) {
        this.ensureDirSync(dirPath);
      }

      memfs.writeFileSync(path, data, { encoding: "utf8" });
    } catch (error) {
      throw new Error(`Failed to write file ${path}: ${error}`);
    }
  }

  
  deleteDirSync(path: string): void {
    try {
      memfs.rmdirSync(path, { recursive: true });
    } catch (error) {
      // Ignore error if directory does not exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new Error(`Failed to delete directory ${path}: ${error}`);
      }
    }
  }

  
  ensureDirSync(dirPath: string): void {
    try {
      // Use memfs.mkdirSync instead of fSync
      if (!this.existsSync(dirPath)) {
        memfs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      // Ignore error if directory already exists
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw new Error(`Failed to create directory ${dirPath}: ${error}`);
      }
    }
  }

  deleteFileSync(path:string) : void {

    try {
      memfs.unlinkSync(path);
    } catch (error) {
      // Ignore error if file does not exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new Error(`Failed to delete file ${path}: ${error}`);
      }
    }
  }
 

  readDirSync(dirPath: string): string[] {
    try {
      const entries = memfs.readdirSync(dirPath);
      // Ensure we return string array (memfs might return Buffer or Dirent)
      return entries.map((entry) => entry.toString());
    } catch (error) {
      throw new Error(`Failed to read directory ${dirPath}: ${error}`);
    }
  }

  chmodSync(path: string, mode: number): void {
    try {
      memfs.chmodSync(path, mode);
    } catch (error) {
      throw new Error(`Failed to change permissions for ${path}: ${error}`);
    }
  }
  // Additional utility methods for testing

  clear(dirPath: string): void {
    try {
      if (this.existsSync(dirPath)) {
        memfs.rmdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to clear in-memory file system: ${error}`);
    }
  }
}
