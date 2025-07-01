import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createIdentityService } from '../../src/index.js';
import { NodeFileSystem } from '@synet/fs/promises';
import { MemFileSystem } from '@synet/fs';
import { getNullLogger, createLogger, LoggerType, LogLevel, NullLogger } from '@synet/logger';
import path from 'node:path';
import os from 'node:os';

describe('IdentityService Integration Tests', () => {
  let identityService: ReturnType<typeof createIdentityService>;
  let testDir: string;
  let fs: NodeFileSystem;


  beforeEach(async () => {
    // Create a unique test directory
    testDir = path.join(os.homedir(),'.synet', 'synet-identity-test', Date.now().toString());
    fs = new NodeFileSystem();
    
    // Ensure test directory exists
    await fs.ensureDir(testDir);

  const logger = createLogger(LoggerType.CONSOLE, {
    level: LogLevel.DEBUG,
    context: "TEST-SERVICE",
    formatting: {
    colorize: true,
    },
  });

  
    // Create identity service
    identityService = createIdentityService({
      storeDir: testDir
    }, getNullLogger());
   });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.deleteDir(testDir);
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  describe('Identity Creation', () => {
    it('should create a new identity successfully', async () => {
      const result = await identityService.createIdentity('test-user');
      
      expect(result.isSuccess).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should create identity with metadata', async () => {
      const metadata = { purpose: 'testing', environment: 'test' };
      const result = await identityService.createIdentity('test-user-meta', metadata);
      
      expect(result.isSuccess).toBe(true);
    });

    it('should create multiple identities', async () => {
      const users = ['alice', 'bob', 'charlie'];
      
      for (const user of users) {
        const result = await identityService.createIdentity(user);
        expect(result.isSuccess).toBe(true);
      }
      
      // Verify all were created
      const listResult = await identityService.listIdentities();
      expect(listResult.isSuccess).toBe(true);
      expect(listResult.value).toHaveLength(3);
    });

    it('should create vault directory structure', async () => {
      await identityService.createIdentity('test-user');
      
      // Check if vault directory exists
      const vaultExists = await fs.exists(testDir);
      expect(vaultExists).toBe(true);
      
      // Check directory contents
      const contents = await fs.readDir(testDir);
      expect(contents.length).toBeGreaterThan(0);
    });
  });

  describe('Identity Retrieval', () => {
    beforeEach(async () => {
      // Create test identities
      await identityService.createIdentity('alice');
      await identityService.createIdentity('bob');
    });

    it('should retrieve identity by alias', async () => {
      const result = await identityService.getIdentity('alice');

      console.log("getIdentityTest:", result.value);


      console.log("Date is instance of ", result.value.createdAt instanceof Date);

      expect(result.isSuccess).toBe(true);
      expect(result.value.alias).toBe('alice');
      expect(result.value.did).toBeDefined();
      expect(result.value.kid).toBeDefined();
      expect(result.value.publicKeyHex).toBeDefined();
      expect(result.value.provider).toBeDefined();
      expect(result.value.credential).toBeDefined();
      expect(result.value.createdAt).toBeInstanceOf(Date);
    });

   /*  it('should retrieve identity by DID', async () => {
      const aliceResult = await identityService.getIdentity('alice');
      expect(aliceResult.isSuccess).toBe(true);
      
      const did = aliceResult.value.did;
      const byDidResult = await identityService.getIdentity(did);
      
      console.log('byDidResult:', byDidResult);
      expect(byDidResult.isSuccess).toBe(true);
      expect(byDidResult.value.alias).toBe('alice');
      expect(byDidResult.value.did).toBe(did);
    }); */

    it('should return error for non-existent identity', async () => {
      const result = await identityService.getIdentity('non-existent');
      
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('should list all identities', async () => {
      const result = await identityService.listIdentities();
      
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      
      const aliases = result.value.map(id => id.alias);
      expect(aliases).toContain('alice');
      expect(aliases).toContain('bob');
    });

    it('should return empty list when no identities exist', async () => {
      // Create fresh service with new directory
      const emptyDir = path.join(os.homedir(), '.synet', 'synet-empty-test', Date.now().toString());
      const emptyService = createIdentityService({
        storeDir: emptyDir
      }, getNullLogger());
      

      const result = await emptyService.listIdentities();
      
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(0);
    });
  });

  describe('Identity Details', () => {
    beforeEach(async () => {
      await identityService.createIdentity('test-user');
    });

    it('should get detailed identity information', async () => {
      const result = await identityService.getIdentityDetails('test-user');
      
      expect(result.isSuccess).toBe(true);
      expect(result.value.identity).toBeDefined();
      expect(result.value.keys).toBeDefined();
      expect(result.value.keys).toBeInstanceOf(Array);
      expect(result.value.keys.length).toBeGreaterThan(0);
      
      // Check key structure
      const key = result.value.keys[0];
      expect(key.kid).toBeDefined();
      expect(key.type).toBeDefined();
      expect(key.publicKeyHex).toBeDefined();
      expect(key.kms).toBeDefined();
    });

    it('should get public key by type', async () => {
      const result = await identityService.getPublicKey('test-user', 'Ed25519');
      
      expect(result.isSuccess).toBe(true);
      if (result.value) {
        expect(result.value.type).toBe('Ed25519');
        expect(result.value.publicKeyHex).toBeDefined();
        expect(result.value.kid).toBeDefined();
      }
    });

    it('should get first available key when no type specified', async () => {
      const result = await identityService.getPublicKey('test-user');
      
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      if (result.value) {
        expect(result.value.publicKeyHex).toBeDefined();
      }
    });
  });

  describe('Identity Management', () => {
    beforeEach(async () => {
      await identityService.createIdentity('original-name');
    });

   /** 
    *  TODO
    *  it('should rename identity', async () => {
      const result = await identityService.renameIdentity('original-name', 'new-name');
      
      expect(result.isSuccess).toBe(true);
      
      // Verify old name doesn't exist
      const oldResult = await identityService.getIdentity('original-name');
      expect(oldResult.isSuccess).toBe(false);
      
      // Verify new name exists
      const newResult = await identityService.getIdentity('new-name');
      expect(newResult.isSuccess).toBe(true);
      expect(newResult.value.alias).toBe('new-name');
    });

     */

    it('should delete identity', async () => {
      const deleteResult = await identityService.deleteIdentity('original-name');
      
      expect(deleteResult.isSuccess).toBe(true);
      
      // Verify identity no longer exists
      const getResult = await identityService.getIdentity('original-name');
      expect(getResult.isSuccess).toBe(false);
      
      // Verify it's not in the list
      const listResult = await identityService.listIdentities();
      expect(listResult.isSuccess).toBe(true);
      expect(listResult.value).toHaveLength(0);
    });

    it('should handle deletion of non-existent identity', async () => {
      const result = await identityService.deleteIdentity('non-existent');
      
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });
  });

  describe('Vault Integration', () => {
    it('should create vault structure correctly', async () => {
      await identityService.createIdentity('vault-test');
      
      // Check if vault directory exists
      const vaultExists = await fs.exists(testDir);
      expect(vaultExists).toBe(true);
      
      // The vault should contain the identity data
      const listResult = await identityService.listIdentities();
      expect(listResult.isSuccess).toBe(true);
      expect(listResult.value).toHaveLength(1);
    });

    it('should handle multiple vaults', async () => {
      const users = ['user1', 'user2', 'user3'];
      
      for (const user of users) {
        const result = await identityService.createIdentity(user);
        expect(result.isSuccess).toBe(true);
      }
      
      // Each should have its own vault entry
      const listResult = await identityService.listIdentities();
      expect(listResult.isSuccess).toBe(true);
      expect(listResult.value).toHaveLength(3);
      
      // Each should be retrievable
      for (const user of users) {
        const getResult = await identityService.getIdentity(user);
        expect(getResult.isSuccess).toBe(true);
        expect(getResult.value.alias).toBe(user);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid vault operations gracefully', async () => {
      // Try to get identity from non-existent vault
      const result = await identityService.getIdentity('non-existent-user');
      
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toContain('not found');
    });

    it('should handle filesystem errors gracefully', async () => {
      // Create identity service with invalid directory
      const invalidService = createIdentityService({
        storeDir: '/invalid/path/that/cannot/be/created'
      }, getNullLogger());
      
      const result = await invalidService.createIdentity('test');
      
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });
  });
});

describe('IdentityService Memory Storage Tests', () => {
  let identityService: ReturnType<typeof createIdentityService>;
  let fs: NodeFileSystem;
    
  fs = new NodeFileSystem();
    
  const testDir = '/tmp/memory-test';
    
  beforeEach(async () => {
    // Create identity service with memory storage

      fs = new NodeFileSystem();    
        // Ensure test directory exists
       await fs.ensureDir(testDir);

      identityService = createIdentityService({
      storeDir: testDir
    }, getNullLogger());

  });

   afterEach(async () => {
    // Clean up test directory
    try {
      await fs.deleteDir(testDir);
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  it('should work with memory filesystem', async () => {
    const result = await identityService.createIdentity('memory-user');
    
 
    expect(result.isSuccess).toBe(true);
    
    const getResult = await identityService.getIdentity('memory-user');
    expect(getResult.isSuccess).toBe(true);
    expect(getResult.value.alias).toBe('memory-user');
  });

  it('should handle multiple identities in memory', async () => {
    const users = ['mem1', 'mem2', 'mem3'];
    
    for (const user of users) {
      const result = await identityService.createIdentity(user);
      expect(result.isSuccess).toBe(true);
    }
    
    const listResult = await identityService.listIdentities();
    expect(listResult.isSuccess).toBe(true);
    expect(listResult.value).toHaveLength(3);
  });
});
