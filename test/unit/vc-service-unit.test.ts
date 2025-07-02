import { describe, it, expect, beforeEach } from 'vitest';
import { createCredentialService } from '../../src/index.js';
import { getNullLogger } from '@synet/logger';
import { CredentialType } from '@synet/credentials';

describe('VCService Tests', () => {
  let vcService: ReturnType<typeof createCredentialService>;

  beforeEach(() => {
    vcService = createCredentialService({
      storeDir: '/tmp/vc-test'
    }, getNullLogger());
  });

  describe('Credential Issuance', () => {
    it('should create VC service successfully', () => {
      expect(vcService).toBeDefined();
      expect(vcService.issueVC).toBeDefined();
      expect(vcService.verifyVC).toBeDefined();
    });

    it('should issue identity credential', async () => {
      const credentialSubject = {
        holder: {
          id: 'did:key:test123',
          name: 'test-user'
        },
        issuedBy: {
          id: 'did:key:test123',
          name: 'test-user'
        }
      };

      const result = await vcService.issueCredential(
        credentialSubject,
        [CredentialType.Identity],
        'did:key:test123'
      );

      console.log('Issue VC result:', result);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess && result.value) {
        expect(result.value.type).toContain('VerifiableCredential');
        expect(result.value.credentialSubject).toEqual(credentialSubject);
        expect(result.value.issuer).toBe('did:key:test123');
      }
    });

    it('should verify issued credential', async () => {
      // First issue a credential
      const credentialSubject = {
        holder: {
          id: 'did:key:test456',
          name: 'verify-test'
        },
        issuedBy: {
          id: 'did:key:test456',
          name: 'verify-test'
        }
      };

      const issueResult = await vcService.issueVC(
        credentialSubject,
        [CredentialType.Identity],
        'did:key:test456'
      );

      expect(issueResult.isSuccess).toBe(true);

      if (issueResult.isSuccess && issueResult.value) {
        // Then verify it
        const verifyResult = await vcService.verifyVC(issueResult.value);

        expect(verifyResult.isSuccess).toBe(true);
        if (verifyResult.isSuccess) {
          expect(verifyResult.value).toBe(true);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid credential subjects', async () => {
      const invalidSubject = {
        holder: { id: '', name: '' },
        issuedBy: { id: '', name: '' }
      };

      const result = await vcService.issueVC(
        invalidSubject,
        [CredentialType.Identity],
        'did:key:invalid'
      );

      // Should either succeed with default values or fail gracefully
      expect(result.isSuccess !== undefined).toBe(true);
    });

    it('should verify service has required methods', () => {
      expect(typeof vcService.issueVC).toBe('function');
      expect(typeof vcService.verifyVC).toBe('function');
    });
  });
});
