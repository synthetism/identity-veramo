"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicVaultFilesystem = void 0;
const vault_core_1 = require("@synet/vault-core");
const node_path_1 = __importDefault(require("node:path"));
/**
 * A filesystem wrapper that dynamically routes operations to vault-specific folders
 */
class DynamicVaultFilesystem {
    constructor(baseFilesystem, baseDir, logger) {
        this.baseFilesystem = baseFilesystem;
        this.baseDir = baseDir;
        this.logger = logger;
    }
    getVaultDir(filename) {
        const vaultId = vault_core_1.vaultEventService.getActiveVaultId();
        if (!vaultId) {
            throw new Error('No active vault selected. Call VaultOperator.use() first.');
        }
        // Create path with vault ID as a subdirectory
        return node_path_1.default.join(this.baseDir, vaultId, filename);
    }
    existsSync(filename) {
        const fullPath = this.getVaultDir(filename);
        return this.baseFilesystem.existsSync(fullPath);
    }
    readFileSync(filename) {
        const fullPath = this.getVaultDir(filename);
        const content = this.baseFilesystem.readFileSync(fullPath);
        const vaultId = vault_core_1.vaultEventService.getActiveVaultId();
        if (!vaultId) {
            throw new Error('No active vault selected');
        }
        vault_core_1.vaultEventService.emitFileChanged(fullPath, vaultId, 'read');
        return content;
    }
    writeFileSync(filename, data) {
        const vaultId = vault_core_1.vaultEventService.getActiveVaultId();
        if (!vaultId) {
            throw new Error('No active vault selected. Call VaultOperator.use() first.');
        }
        const vaultDir = node_path_1.default.join(this.baseDir, vaultId);
        // Ensure vault directory exists
        this.baseFilesystem.ensureDirSync(vaultDir);
        // Write file to vault-specific directory
        const fullPath = node_path_1.default.join(vaultDir, filename);
        this.baseFilesystem.writeFileSync(fullPath, data);
        // Emit event
        vault_core_1.vaultEventService.emitFileChanged(fullPath, vaultId, 'write');
        this.logger?.debug(`File written: ${fullPath}`);
    }
    deleteFileSync(filename) {
        const fullPath = this.getVaultDir(filename);
        this.baseFilesystem.deleteFileSync(fullPath);
        const vaultId = vault_core_1.vaultEventService.getActiveVaultId();
        if (!vaultId) {
            throw new Error('No active vault selected');
        }
        vault_core_1.vaultEventService.emitFileChanged(fullPath, vaultId, 'delete');
    }
    // Implement other filesystem methods similarly
    deleteDirSync(dirPath) {
        const vaultId = vault_core_1.vaultEventService.getActiveVaultId();
        if (!vaultId) {
            throw new Error('No active vault selected');
        }
        if (dirPath === '') {
            const vaultDir = node_path_1.default.join(this.baseDir, vaultId);
            this.baseFilesystem.deleteDirSync(vaultDir);
        }
        else {
            const fullPath = this.getVaultDir(dirPath);
            this.baseFilesystem.deleteDirSync(fullPath);
        }
    }
    ensureDirSync(dirPath) {
        const vaultId = vault_core_1.vaultEventService.getActiveVaultId();
        if (!vaultId) {
            throw new Error('No active vault selected');
        }
        if (dirPath === '') {
            const vaultDir = node_path_1.default.join(this.baseDir, vaultId);
            this.baseFilesystem.ensureDirSync(vaultDir);
        }
        else {
            const fullPath = this.getVaultDir(dirPath);
            this.baseFilesystem.ensureDirSync(fullPath);
        }
    }
    readDirSync(dirPath) {
        const vaultId = vault_core_1.vaultEventService.getActiveVaultId();
        if (!vaultId) {
            throw new Error('No active vault selected');
        }
        if (dirPath === '') {
            const vaultDir = node_path_1.default.join(this.baseDir, vaultId);
            return this.baseFilesystem.readDirSync(vaultDir);
        }
        const fullPath = this.getVaultDir(dirPath);
        return this.baseFilesystem.readDirSync(fullPath);
    }
    chmodSync(path, mode) {
        try {
            this.baseFilesystem.chmodSync(path, mode);
        }
        catch (error) {
            throw new Error(`Failed to change permissions for ${path}: ${error}`);
        }
    }
}
exports.DynamicVaultFilesystem = DynamicVaultFilesystem;
