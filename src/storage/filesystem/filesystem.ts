import * as fs from "node:fs/promises";
import fSync from "node:fs";
import type { IFileSystem } from "./filesystem.interface";

/**
 * Node.js implementation of FileSystem interface
 */
export class NodeFileSystem implements IFileSystem {
  async exists(path: string): Promise<boolean> {
    return fs
      .access(path)
      .then(() => true)
      .catch(() => false);
  }

  existsSync(path: string): boolean {
    return fSync.existsSync(path);
  }

  async readFile(path: string): Promise<string> {
    return fs.readFile(path, "utf-8");
  }

  readFileSync(path: string): string {
    return fSync.readFileSync(path, "utf-8");
  }

  async writeFile(path: string, data: string): Promise<void> {
    return fs.writeFile(path, data, "utf-8");
  }

  async deleteFile(path: string): Promise<void> {
    return fs.unlink(path);
  }

  async deleteDir(path: string): Promise<void> {
    try {
      await fs.rmdir(path, { recursive: true });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  deleteDirSync(path: string): void {
    if (fSync.existsSync(path)) {
      fSync.rmdirSync(path, { recursive: true });
    }
  }

  async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code !== "EEXIST"
      ) {
        throw error;
      }
    }
  }

  ensureDirSync(dirPath: string): void {
    if (!fSync.existsSync(dirPath)) {
      fSync.mkdirSync(dirPath, { recursive: true });
    }
  }

  async readDir(dirPath: string): Promise<string[]> {
    return fs.readdir(dirPath);
  }

  readDirSync(dirPath: string): string[] {
    return fSync.readdirSync(dirPath);
  }
  async chmod(path: string, mode: number): Promise<void> {
    return fs.chmod(path, mode);
  }
}
