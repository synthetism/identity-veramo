import type { IFileSystem } from "@synet/patterns/filesystem";
import type { Logger } from "@synet/logger";
/**
 * A filesystem wrapper that dynamically routes operations to vault-specific folders
 */
export declare class DynamicVaultFilesystem implements IFileSystem {
    private baseFilesystem;
    private baseDir;
    private logger?;
    constructor(baseFilesystem: IFileSystem, baseDir: string, logger?: Logger | undefined);
    private getVaultDir;
    existsSync(filename: string): boolean;
    readFileSync(filename: string): string;
    writeFileSync(filename: string, data: string): void;
    deleteFileSync(filename: string): void;
    deleteDirSync(dirPath: string): void;
    ensureDirSync(dirPath: string): void;
    readDirSync(dirPath: string): string[];
    chmodSync(path: string, mode: number): void;
}
