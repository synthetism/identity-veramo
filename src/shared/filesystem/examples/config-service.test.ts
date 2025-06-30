// @synet/identity/src/shared/filesystem/examples/config-service.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  type IFileSystem, 
  MemFileSystem, 
  ObservableFileSystem, 
  FilesystemEventTypes,
  type FilesystemEvent
} from '../index';
import { ConfigService } from './config-service.example';

describe('ConfigService with Filesystem Abstraction', () => {
  let fs: IFileSystem;
  let configService: ConfigService;
  
  beforeEach(() => {
    // Use in-memory filesystem for fast, isolated tests
    fs = new MemFileSystem();
    configService = new ConfigService(fs);
  });
  
  describe('basic functionality', () => {
    it('should return default config when no file exists', () => {
      const config = configService.loadConfig();
      
      expect(config).toEqual({
        theme: 'light',
        language: 'en',
        features: {
          notifications: true,
          analytics: false
        }
      });
    });
    
    it('should save and load config correctly', () => {
      const config = {
        theme: 'dark' as const,
        language: 'es',
        features: {
          notifications: false,
          analytics: true
        }
      };
      
      configService.saveConfig(config);
      const loadedConfig = configService.loadConfig();
      
      expect(loadedConfig).toEqual(config);
    });
    
    it('should reset config by deleting the file', () => {
      const config = {
        theme: 'dark' as const,
        language: 'es',
        features: {
          notifications: false,
          analytics: true
        }
      };
      
      configService.saveConfig(config);
      expect(fs.existsSync('./app-config.json')).toBe(true);
      
      configService.resetConfig();
      expect(fs.existsSync('./app-config.json')).toBe(false);
      
      // Should return default config after reset
      const loadedConfig = configService.loadConfig();
      expect(loadedConfig.theme).toBe('light');
    });
    
    it('should handle invalid JSON gracefully', () => {
      // Manually write invalid JSON
      fs.writeFileSync('./app-config.json', '{ invalid json }');
      
      const config = configService.loadConfig();
      
      // Should return default config when JSON is invalid
      expect(config.theme).toBe('light');
    });
  });
  
  describe('with observable filesystem', () => {
    let observableFs: ObservableFileSystem;
    let events: FilesystemEvent[];
    
    beforeEach(() => {
      observableFs = new ObservableFileSystem(new MemFileSystem());
      configService = new ConfigService(observableFs);
      events = [];
      
      // Capture all events
      for (const eventType of Object.values(FilesystemEventTypes)) {
        observableFs.getEventEmitter().subscribe(eventType, {
          update(event: FilesystemEvent) {
            events.push(event);
          }
        });
      }
    });
    
    it('should emit events for filesystem operations', () => {
      // Load config (will check existence, then read default)
      configService.loadConfig();
      
      // Save config
      configService.saveConfig({
        theme: 'dark',
        language: 'en',
        features: { notifications: true, analytics: false }
      });
      
      // Load again
      configService.loadConfig();
      
      // Check that events were emitted
      const existsEvents = events.filter(e => e.type === FilesystemEventTypes.EXISTS);
      const writeEvents = events.filter(e => e.type === FilesystemEventTypes.WRITE);
      const readEvents = events.filter(e => e.type === FilesystemEventTypes.READ);
      
      expect(existsEvents.length).toBeGreaterThan(0);
      expect(writeEvents.length).toBe(1);
      expect(readEvents.length).toBe(1);
      
      // Check event data structure
      const writeEvent = writeEvents[0];
      expect(writeEvent.data.filePath).toBe('./app-config.json');
      expect(writeEvent.data.operation).toBe('write');
      expect(writeEvent.data.result).toBeTypeOf('number'); // Content length
    });
    
    it('should emit error events for failed operations', () => {
      // Try to read a file that doesn't exist
      try {
        observableFs.readFileSync('./nonexistent-file.json');
      } catch {
        // Expected to throw
      }
      
      const errorEvents = events.filter(e => 
        e.type === FilesystemEventTypes.READ && e.data.error
      );
      
      expect(errorEvents.length).toBe(1);
      expect(errorEvents[0].data.error).toBeDefined();
      expect(errorEvents[0].data.filePath).toBe('./nonexistent-file.json');
    });
    
    it('should allow selective event monitoring', () => {
      // Create observable filesystem that only monitors write operations
      const selectiveFs = new ObservableFileSystem(
        new MemFileSystem(), 
        [FilesystemEventTypes.WRITE]
      );
      
      const selectiveEvents: FilesystemEvent[] = [];
      
      // Subscribe to all event types
      for (const eventType of Object.values(FilesystemEventTypes)) {
        selectiveFs.getEventEmitter().subscribe(eventType, {
          update(event: FilesystemEvent) {
            selectiveEvents.push(event);
          }
        });
      }
      
      const selectiveConfigService = new ConfigService(selectiveFs);
      
      // Perform operations
      selectiveConfigService.loadConfig(); // Involves exists + read
      selectiveConfigService.saveConfig({
        theme: 'dark',
        language: 'en',
        features: { notifications: true, analytics: false }
      }); // Involves write
      
      // Only write events should be captured
      expect(selectiveEvents.length).toBe(1);
      expect(selectiveEvents[0].type).toBe(FilesystemEventTypes.WRITE);
    });
  });
  
  describe('filesystem independence', () => {
    it('should work with different filesystem implementations', () => {
      const config = {
        theme: 'dark' as const,
        language: 'fr',
        features: {
          notifications: true,
          analytics: true
        }
      };
      
      // Test with multiple filesystem implementations
      const filesystems = [
        new MemFileSystem(),
        new ObservableFileSystem(new MemFileSystem())
      ];
      
      for (const filesystem of filesystems) {
        const service = new ConfigService(filesystem);
        
        service.saveConfig(config);
        const loaded = service.loadConfig();
        
        expect(loaded).toEqual(config);
      }
    });
  });
});
