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

  async exists(path: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        memfs.statSync(path);
        resolve(true);
      } catch {
        resolve(false);
      }
    });
  }

  async readFile(path: string): Promise<string> {
    try {
      const buffer = await memfs.promises.readFile(path);
      return buffer.toString("utf8");
    } catch (error) {
      throw new Error(`Failed to read file ${path}: ${error}`);
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

  async writeFile(path: string, data: string): Promise<void> {
    try {
      // Ensure the directory exists before writing
      const dirPath = path.substring(0, path.lastIndexOf("/"));
      if (dirPath && !this.exists(dirPath)) {
        await this.ensureDir(dirPath);
      }

      await memfs.promises.writeFile(path, data, { encoding: "utf8" });
    } catch (error) {
      throw new Error(`Failed to write file ${path}: ${error}`);
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await memfs.promises.unlink(path);
    } catch (error) {
      throw new Error(`Failed to delete file ${path}: ${error}`);
    }
  }

  async deleteDir(path: string): Promise<void> {
    try {
      await memfs.promises.rmdir(path, { recursive: true });
    } catch (error) {
      // Ignore error if directory does not exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new Error(`Failed to delete directory ${path}: ${error}`);
      }
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

  async ensureDir(path: string): Promise<void> {
    try {
      await memfs.promises.mkdir(path, { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw new Error(`Failed to create directory ${path}: ${error}`);
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

  async chmod(path: string, mode: number): Promise<void> {
    try {
      await memfs.promises.chmod(path, mode);
    } catch (error) {
      throw new Error(`Failed to change permissions for ${path}: ${error}`);
    }
  }

  async readDir(dirPath: string): Promise<string[]> {
    try {
      const entries = await memfs.promises.readdir(dirPath);
      // Ensure we return string array (memfs might return Buffer or Dirent)
      return entries.map((entry) => entry.toString());
    } catch (error) {
      throw new Error(`Failed to read directory ${dirPath}: ${error}`);
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

  // Additional utility methods for testing

  async clear(dirPath: string): Promise<void> {
    try {
      if (this.existsSync(dirPath)) {
        await memfs.promises.rmdir(dirPath, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to clear in-memory file system: ${error}`);
    }
  }
}
