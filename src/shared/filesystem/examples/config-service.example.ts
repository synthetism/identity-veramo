// @synet/identity/src/shared/filesystem/examples/config-service.example.ts

import { 
  type IFileSystem, 
  NodeFileSystem, 
  MemFileSystem, 
  ObservableFileSystem, 
  FilesystemEventTypes,
  type FilesystemEvent
} from '../index';

interface AppConfig {
  theme: 'light' | 'dark';
  language: string;
  features: {
    notifications: boolean;
    analytics: boolean;
  };
}

/**
 * Example service that uses filesystem abstraction
 */
export class ConfigService {
  private readonly configPath = './app-config.json';
  
  constructor(private fs: IFileSystem) {}
  
  loadConfig(): AppConfig {
    if (this.fs.existsSync(this.configPath)) {
      try {
        const content = this.fs.readFileSync(this.configPath);
        return JSON.parse(content);
      } catch (error) {
        console.warn('Failed to parse config, using defaults:', error);
        return this.getDefaultConfig();
      }
    }
    return this.getDefaultConfig();
  }
  
  saveConfig(config: AppConfig): void {
    try {
      this.fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }
  
  resetConfig(): void {
    if (this.fs.existsSync(this.configPath)) {
      this.fs.deleteFileSync(this.configPath);
    }
  }
  
  private getDefaultConfig(): AppConfig {
    return {
      theme: 'light',
      language: 'en',
      features: {
        notifications: true,
        analytics: false
      }
    };
  }
}

/**
 * Example usage with different filesystem implementations
 */
export function demonstrateFilesystemPattern() {
  console.log('🚀 Filesystem Pattern Demonstration\n');
  
  // 1. Basic usage with real filesystem
  console.log('1️⃣ Using NodeFileSystem (real filesystem):');
  const prodConfigService = new ConfigService(new NodeFileSystem());
  
  const config = prodConfigService.loadConfig();
  console.log('Loaded config:', config);
  
  config.theme = 'dark';
  prodConfigService.saveConfig(config);
  console.log('Config saved with dark theme\n');
  
  // 2. Testing with in-memory filesystem
  console.log('2️⃣ Using MemFileSystem (in-memory for testing):');
  const testConfigService = new ConfigService(new MemFileSystem());
  
  const testConfig = testConfigService.loadConfig();
  console.log('Test config (default):', testConfig);
  
  testConfig.features.analytics = true;
  testConfigService.saveConfig(testConfig);
  
  const reloadedConfig = testConfigService.loadConfig();
  console.log('Reloaded test config:', reloadedConfig);
  console.log('Analytics enabled:', reloadedConfig.features.analytics, '\n');
  
  // 3. Observable filesystem with event monitoring
  console.log('3️⃣ Using ObservableFileSystem (with event monitoring):');
  
  const observableFs = new ObservableFileSystem(new MemFileSystem());
  const observableConfigService = new ConfigService(observableFs);
  
  // Set up event monitoring
  const eventLogger = {
    update(event: FilesystemEvent) {
      const { filePath, operation, result, error } = event.data;
      
      if (error) {
        console.log(`❌ ${operation} failed on ${filePath}: ${error.message}`);
      } else {
        const resultInfo = result !== undefined ? ` (${result})` : '';
        console.log(`✅ ${operation} on ${filePath}${resultInfo}`);
      }
    }
  };
  
  // Monitor all filesystem operations
  for (const eventType of Object.values(FilesystemEventTypes)) {
    observableFs.getEventEmitter().subscribe(eventType, eventLogger);
  }
  
  console.log('Monitoring filesystem events...');
  
  // These operations will trigger events
  const monitoredConfig = observableConfigService.loadConfig();
  monitoredConfig.language = 'es';
  observableConfigService.saveConfig(monitoredConfig);
  
  console.log('\n4️⃣ Demonstrating error handling:');
  
  // Simulate error by trying to read from a path that causes issues
  try {
    observableFs.readFileSync('/this/path/does/not/exist.json');
  } catch (error) {
    // The error event was already logged by our observer
    console.log('Error handled gracefully');
  }
  
  console.log('\n✨ Demonstration complete!');
}

// Example of advanced composition
export function demonstrateAdvancedComposition() {
  console.log('\n🔧 Advanced Composition Example\n');
  
  // Create a caching filesystem decorator
  class CachedFileSystem implements IFileSystem {
    private cache = new Map<string, string>();
    
    constructor(private baseFs: IFileSystem) {}
    
    existsSync(path: string): boolean {
      return this.baseFs.existsSync(path);
    }
    
    readFileSync(path: string): string {
      if (this.cache.has(path)) {
        console.log(`📋 Cache hit for ${path}`);
        const cachedContent = this.cache.get(path);
        if (cachedContent === undefined) {
          throw new Error(`Cache inconsistency for ${path}`);
        }
        return cachedContent;
      }
      
      console.log(`💾 Cache miss for ${path}, reading from filesystem`);
      const content = this.baseFs.readFileSync(path);
      this.cache.set(path, content);
      return content;
    }
    
    writeFileSync(path: string, data: string): void {
      this.baseFs.writeFileSync(path, data);
      this.cache.set(path, data); // Update cache
      console.log(`💾 Updated cache for ${path}`);
    }
    
    deleteFileSync(path: string): void {
      this.baseFs.deleteFileSync(path);
      this.cache.delete(path);
      console.log(`🗑️ Removed ${path} from cache`);
    }
    
    // Implement remaining methods...
    deleteDirSync(path: string): void {
      this.baseFs.deleteDirSync(path);
    }
    
    ensureDirSync(path: string): void {
      this.baseFs.ensureDirSync(path);
    }
    
    readDirSync(path: string): string[] {
      return this.baseFs.readDirSync(path);
    }
    
    chmodSync(path: string, mode: number): void {
      this.baseFs.chmodSync(path, mode);
    }
  }
  
  // Compose multiple decorators
  const baseFs = new MemFileSystem();
  const observableFs = new ObservableFileSystem(baseFs);
  const cachedFs = new CachedFileSystem(observableFs);
  
  const configService = new ConfigService(cachedFs);
  
  console.log('Using composed filesystem: Memory + Observable + Cached');
  
  // Set up minimal event monitoring
  observableFs.getEventEmitter().subscribe(FilesystemEventTypes.READ, {
    update() { console.log('📖 File read event detected'); }
  });
  
  observableFs.getEventEmitter().subscribe(FilesystemEventTypes.WRITE, {
    update() { console.log('✏️ File write event detected'); }
  });
  
  // First read - cache miss
  const config1 = configService.loadConfig();
  
  // Second read - cache hit
  const config2 = configService.loadConfig();
  
  // Write - updates cache
  config2.theme = 'dark';
  configService.saveConfig(config2);
  
  // Third read - cache hit with updated data
  const config3 = configService.loadConfig();
  console.log('Final config theme:', config3.theme);
  
  console.log('\n✨ Advanced composition complete!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  demonstrateFilesystemPattern();
  demonstrateAdvancedComposition();
}
