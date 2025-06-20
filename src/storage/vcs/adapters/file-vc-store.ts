import type { IFileSystem } from "../../filesystem/filesystem.interface";
import VError  from "verror";
import type { Logger } from "@synet/logger";
import path from "node:path";
import type { IVCStore } from "../vc-store.interface";

export class FileVCStore<T> implements IVCStore<T> {
  constructor(
    private readonly dir: string,
    private readonly fs: IFileSystem,
    private readonly logger?: Logger,
  ) {}

  private resolvePath(id: string): string {
    return path.join(this.dir, `${id}.json`);
  }

  async exists(id: string): Promise<boolean> {
    try {
    const filePath = this.resolvePath(id);
    return this.fs.exists(filePath);
    } catch (error: unknown) {
      throw new VError(
        {
          name: "FileVCStoreError",
          cause: error instanceof Error ? error : undefined,
        },
        `Failed to check existence of VC with id: ${id}`,
      );
    }
  }

  async create(id: string, item: T): Promise<void> {
    try {
      
      const filePath = this.resolvePath(id);
      await this.fs.writeFile(filePath, JSON.stringify(item, null, 2));

      this.logger?.debug(`Saving VC with id: ${id} to file: ${filePath}`);
      
    } catch (error: unknown) {
      throw new VError(
        {
          name: "FileVCStoreError",
          cause: error instanceof Error ? error : undefined,
        },
        `Failed to create VC with id: ${id}`,
      );
    }
  }

  async get(id: string): Promise<T | null> {

    try {
    const filePath = this.resolvePath(id);
    if (!(await this.fs.exists(filePath))) return null;
    const raw = await this.fs.readFile(filePath);
    return JSON.parse(raw.toString());
    } catch (error: unknown) {
      throw new VError(
        {
          name: "FileVCStoreError",
          cause: error instanceof Error ? error : undefined,
        },
        `Failed to get VC with id: ${id}`,
      );
    }
  }

  async delete(id: string): Promise<boolean> {

    try {
    const filePath = this.resolvePath(id);
    if (!(await this.fs.exists(filePath))) return false;
    await this.fs.deleteFile(filePath);
    return true;
    } catch (error: unknown) {
      throw new VError(
        {
          name: "FileVCStoreError",
          cause: error instanceof Error ? error : undefined,
        },
        `Failed to delete VC with id: ${id}`,
      );
    }
  }

  async list(): Promise<T[]> {
    try {
    const files = await this.fs.readDir(this.dir);
    const vcs: T[] = [];
    for (const file of files) {
      const content = await this.fs.readFile(path.join(this.dir, file));
      vcs.push(JSON.parse(content.toString()));
    }
    return vcs;
    } catch (error: unknown) {
      
      this.logger?.error(`Error listing VCs: ${error instanceof Error ? error.message : String(error)}`);
      throw new VError(
        {
          name: "FileVCStoreError",
          cause: error instanceof Error ? error : undefined,
        },
        'Failed to list VCs',
      );
    }
  }
}
