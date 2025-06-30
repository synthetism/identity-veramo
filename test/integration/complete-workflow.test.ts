import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createIdentityService, createVCService } from '../../src/index.js';
import { NodeFileSystem } from '@synet/fs/promises';
import { getNullLogger } from '@synet/logger';
import { CredentialType } from '@synet/credentials';
import path from 'node:path';
import os from 'node:os';

describe('Complete Identity Workflow Integration', () => {
  let identityService: ReturnType<typeof createIdentityService>;
  let vcService: ReturnType<typeof createVCService>;
  let testDir: string;
  let fs: NodeFileSystem;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), 'synet-workflow-test', Date.now().toString());
    fs = new NodeFileSystem();
    
    await fs.ensureDir(testDir);
    
    identityService = createIdentityService({
      storeDir: testDir
    }, getNullLogger());

    vcService = createVCService({
      storeDir: testDir
    }, getNullLogger());
  });

  afterEach(async () => {
    try {
      await fs.deleteDir(testDir);
    } catch (error) {
      console.warn('Failed to cleanup workflow test directory:', error);
    }
  });

  describe('End-to-End Identity Workflow', () => {
    it('should complete full identity lifecycle', async () => {
      // Step 1: Create identity with metadata
      const createResult = await identityService.createIdentity('workflow-user', {
        purpose: 'e2e-test',
        environment: 'testing',
        version: '1.0.0'
      });

      expect(createResult.isSuccess).toBe(true);

      // Step 2: Verify identity was created properly
      const getResult = await identityService.getIdentity('workflow-user');
      expect(getResult.isSuccess).toBe(true);
      
      const identity = getResult.value;
      expect(identity.alias).toBe('workflow-user');
      expect(identity.did).toMatch(/^did:key:/);
      expect(identity.kid).toBeDefined();
      expect(identity.publicKeyHex).toBeDefined();
      expect(identity.provider).toBe('did:key');
      expect(identity.credential).toBeDefined();
      expect(identity.createdAt).toBeInstanceOf(Date);

      // Step 3: Get detailed identity information
      const detailsResult = await identityService.getIdentityDetails('workflow-user');
      expect(detailsResult.isSuccess).toBe(true);
      
      const details = detailsResult.value;
      expect(details.identity).toEqual(identity);
      expect(details.keys).toBeDefined();
      expect(details.keys.length).toBeGreaterThan(0);

      // Step 4: Verify key structure
      const firstKey = details.keys[0];
      expect(firstKey.kid).toBe(identity.kid);
      expect(firstKey.type).toBeDefined();
      expect(firstKey.publicKeyHex).toBe(identity.publicKeyHex);
      expect(firstKey.kms).toBeDefined();

      // Step 5: Get public key by type
      const keyResult = await identityService.getPublicKey('workflow-user', 'Ed25519');
      expect(keyResult.isSuccess).toBe(true);
      expect(keyResult.value).toBeDefined();
      
      if (keyResult.value) {
        expect(keyResult.value.type).toBe('Ed25519');
        expect(keyResult.value.publicKeyHex).toBe(identity.publicKeyHex);
      }

      // Step 6: Verify credential structure
      const credential = identity.credential;
      expect(credential.type).toContain('VerifiableCredential');
      expect(credential.issuer).toBeDefined();
      expect(credential.credentialSubject).toBeDefined();
      expect(credential.credentialSubject.holder.id).toBe(identity.did);
      expect(credential.credentialSubject.holder.name).toBe('workflow-user');

      // Step 7: Verify credential with VC service
      const verifyResult = await vcService.verifyVC(credential);
      expect(verifyResult.isSuccess).toBe(true);

      // Step 8: List identities to verify presence
      const listResult = await identityService.listIdentities();
      expect(listResult.isSuccess).toBe(true);
      expect(listResult.value).toHaveLength(1);
      expect(listResult.value[0].alias).toBe('workflow-user');

      // Step 9: Rename identity
      const renameResult = await identityService.renameIdentity('workflow-user', 'renamed-user');
      expect(renameResult.isSuccess).toBe(true);

      // Step 10: Verify rename worked
      const renamedResult = await identityService.getIdentity('renamed-user');
      expect(renamedResult.isSuccess).toBe(true);
      expect(renamedResult.value.alias).toBe('renamed-user');
      expect(renamedResult.value.did).toBe(identity.did); // DID should remain same

      // Step 11: Verify old name no longer works
      const oldNameResult = await identityService.getIdentity('workflow-user');
      expect(oldNameResult.isSuccess).toBe(false);

      // Step 12: Create additional identity to test multi-vault
      const secondResult = await identityService.createIdentity('second-user');
      expect(secondResult.isSuccess).toBe(true);

      // Step 13: Verify both identities exist
      const finalListResult = await identityService.listIdentities();
      expect(finalListResult.isSuccess).toBe(true);
      expect(finalListResult.value).toHaveLength(2);
      
      const aliases = finalListResult.value.map(id => id.alias);
      expect(aliases).toContain('renamed-user');
      expect(aliases).toContain('second-user');

      // Step 14: Delete one identity
      const deleteResult = await identityService.deleteIdentity('second-user');
      expect(deleteResult.isSuccess).toBe(true);

      // Step 15: Verify deletion
      const afterDeleteResult = await identityService.listIdentities();
      expect(afterDeleteResult.isSuccess).toBe(true);
      expect(afterDeleteResult.value).toHaveLength(1);
      expect(afterDeleteResult.value[0].alias).toBe('renamed-user');

      // Step 16: Verify file system structure
      const vaultExists = await fs.exists(testDir);
      expect(vaultExists).toBe(true);

      const vaultContents = await fs.readDir(testDir);
      expect(vaultContents.length).toBeGreaterThan(0);
    });

    it('should handle complex multi-identity scenarios', async () => {
      // Create multiple identities with different purposes
      const identities = [
        { alias: 'admin-user', meta: { role: 'admin', level: 'high' } },
        { alias: 'regular-user', meta: { role: 'user', level: 'medium' } },
        { alias: 'guest-user', meta: { role: 'guest', level: 'low' } }
      ];

      // Create all identities
      for (const { alias, meta } of identities) {
        const result = await identityService.createIdentity(alias, meta);
        expect(result.isSuccess).toBe(true);
      }

      // Verify all were created
      const listResult = await identityService.listIdentities();
      expect(listResult.isSuccess).toBe(true);
      expect(listResult.value).toHaveLength(3);

      // Verify each identity has unique properties
      for (const identity of listResult.value) {
        const detailsResult = await identityService.getIdentityDetails(identity.alias);
        expect(detailsResult.isSuccess).toBe(true);
        
        // Each identity should have its own DID and keys
        expect(identity.did).toMatch(/^did:key:/);
        expect(identity.kid).toBeDefined();
        expect(identity.publicKeyHex).toBeDefined();
        
        // Verify keys are working
        const keyResult = await identityService.getPublicKey(identity.alias);
        expect(keyResult.isSuccess).toBe(true);
        expect(keyResult.value).toBeDefined();
      }

      // Test bulk operations
      const allDetails = await Promise.all(
        identities.map(({ alias }) => identityService.getIdentityDetails(alias))
      );

      expect(allDetails.every(result => result.isSuccess)).toBe(true);

      // Verify DIDs are unique
      const dids = listResult.value.map(identity => identity.did);
      const uniqueDids = new Set(dids);
      expect(uniqueDids.size).toBe(dids.length);

      // Verify Key IDs are unique
      const kids = listResult.value.map(identity => identity.kid);
      const uniqueKids = new Set(kids);
      expect(uniqueKids.size).toBe(kids.length);
    });

    it('should maintain vault integrity across operations', async () => {
      // Create identity
      await identityService.createIdentity('vault-test');

      // Verify vault structure exists
      const vaultExists = await fs.exists(testDir);
      expect(vaultExists).toBe(true);

      // Perform multiple operations
      await identityService.getIdentity('vault-test');
      await identityService.getIdentityDetails('vault-test');
      await identityService.getPublicKey('vault-test');
      await identityService.listIdentities();

      // Verify vault still intact
      const stillExists = await fs.exists(testDir);
      expect(stillExists).toBe(true);

      // Create another identity to test vault expansion
      await identityService.createIdentity('vault-test-2');

      const listResult = await identityService.listIdentities();
      expect(listResult.isSuccess).toBe(true);
      expect(listResult.value).toHaveLength(2);

      // Delete one identity
      await identityService.deleteIdentity('vault-test');

      // Verify other identity still works
      const remainingResult = await identityService.getIdentity('vault-test-2');
      expect(remainingResult.isSuccess).toBe(true);

      const finalListResult = await identityService.listIdentities();
      expect(finalListResult.isSuccess).toBe(true);
      expect(finalListResult.value).toHaveLength(1);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle rapid successive operations', async () => {
      // Rapid identity creation
      const promises = Array.from({ length: 5 }, (_, i) =>
        identityService.createIdentity(`rapid-${i}`)
      );

      const results = await Promise.all(promises);
      expect(results.every(result => result.isSuccess)).toBe(true);

      // Verify all were created correctly
      const listResult = await identityService.listIdentities();
      expect(listResult.isSuccess).toBe(true);
      expect(listResult.value).toHaveLength(5);
    });

    it('should handle operations on non-existent identities gracefully', async () => {
      const operations = [
        () => identityService.getIdentity('non-existent'),
        () => identityService.getIdentityDetails('non-existent'),
        () => identityService.getPublicKey('non-existent'),
        () => identityService.renameIdentity('non-existent', 'new-name'),
        () => identityService.deleteIdentity('non-existent')
      ];

      for (const operation of operations) {
        const result = await operation();
        expect(result.isSuccess).toBe(false);
        expect(result.errorMessage).toBeDefined();
      }
    });

    it('should maintain consistency after failed operations', async () => {
      // Create a valid identity
      const createResult = await identityService.createIdentity('consistency-test');
      expect(createResult.isSuccess).toBe(true);

      // Attempt invalid operations
      await identityService.renameIdentity('non-existent', 'should-fail');
      await identityService.deleteIdentity('non-existent');

      // Verify original identity is still intact
      const getResult = await identityService.getIdentity('consistency-test');
      expect(getResult.isSuccess).toBe(true);

      const listResult = await identityService.listIdentities();
      expect(listResult.isSuccess).toBe(true);
      expect(listResult.value).toHaveLength(1);
      expect(listResult.value[0].alias).toBe('consistency-test');
    });
  });
});
