import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VCService } from '../../src/providers/verano/services/vc-service';
import path from 'node:path';
import { MemFileSystem } from '../../src/infrastructure/filesystem/memory';
import { FileVCStore } from '../../src/infrastructure/vcs/adapters/file-vc-store';
import  { mockLogger } from '../fixtures/mockLogger';
import { mockAgent } from '../fixtures/mockAgent';
import type { Logger } from '@synet/logger';
import type {SynetVerifiableCredential, OrgCredentialSubject } from '../../src/types/credential';

describe('VCService', () => {
  // Mock Veramo agent

  // Mock filesystem
  const mockFileSystem = new MemFileSystem();
  
  // Storage path for testing
  const testDir = '/test';
  const testStoragePath = path.join(testDir, 'vc-store');

  // Ensure test storage path exists

  const sampleContext = [
    'https://www.w3.org/2018/credentials/v1',
    'https://synthetism.org/credentials/v1'
  ];

  // Sample data
  const sampleDid = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
  const sampleSubject = {
    networkId: 'test-network',
    holder: {
      id: sampleDid,
      type: 'Person'
    },
    name: 'John Doe',
    age: 30,
    email: 'john@example.com'
  } as OrgCredentialSubject; // Use Record to allow flexible subject structure
  const sampleTypes = ['IdentityCredential'];
  
  // Sample credential UUID - we'll mock uuid to return this value consistently
  const sampleCredentialId = 'urn:uuid:123e4567-e89b-12d3-a456-426614174000';
  
  // Sample verifiable credential
  const sampleVC: SynetVerifiableCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: sampleCredentialId,
    type: ['VerifiableCredential', ...sampleTypes],
    issuer: { id: sampleDid },
    issuanceDate: '2023-01-01T00:00:00Z',
    credentialSubject: sampleSubject,
    proof: {
      type: 'JwtProof2020',
      jwt: 'eyJhbGciOiJFZERTQSJ9...'
    }
  };

  let vcService: VCService;
  let vcStore: FileVCStore<SynetVerifiableCredential>;

//mockFileSystem.ensureDirSync(testStoragePath);

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    
    // Mock UUID to return consistent results for testing
   vi.mock('@paralleldrive/cuid2', () => ({
      createId: () => 'urn:uuid:123e4567-e89b-12d3-a456-426614174000'
    }));
    
    mockFileSystem.ensureDirSync(testDir);
    mockFileSystem.ensureDirSync(testStoragePath); // Make sure this directory exists
  
    // Ensure test directory

    // Setup VCStore
    vcStore = new FileVCStore(testStoragePath, mockFileSystem);
    
    // Setup VCService
    vcService = new VCService(
      mockAgent as any,
      vcStore,
      { defaultIssuerDid: sampleDid },
      mockLogger as Logger
    );
    
    // Default mock implementations
    mockAgent.didManagerGet.mockResolvedValue({ did: sampleDid });
    mockAgent.createVerifiableCredential.mockResolvedValue(sampleVC);
    mockAgent.verifyCredential.mockResolvedValue({ verified: true });
    
    
  });

  afterEach(() => {
    // Clean up test directory
    try {
      mockFileSystem.deleteDir(testDir);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('issueVC', () => {
    it('should issue a verifiable credential', async () => {

      const result = await vcService.issueVC(        
        sampleSubject, 
        sampleTypes,
        sampleDid, // Explicitly provide issuer DID
        {
          context: sampleContext,
          vcId: sampleCredentialId
        });
    
   
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(sampleVC);
      
      // Verify agent was called correctly
      expect(mockAgent.createVerifiableCredential).toHaveBeenCalledWith({
        credential: {
          '@context': sampleContext,
          issuer: { id: sampleDid },
          type: ['VerifiableCredential', ...sampleTypes],
          issuanceDate: expect.any(String),
          credentialSubject: sampleSubject,
          id: sampleCredentialId
        },
        proofFormat: 'jwt'
      });
      
      // Verify credential was stored (VCService now stores with full ID)
      const storedCredential = await vcStore.get(sampleCredentialId);
      expect(storedCredential).toEqual(sampleVC);
      
   
    });
    
    it('should fail if no issuer DID is provided or configured', async () => {
      // Create service without default issuer
      const serviceWithoutIssuer = new VCService(
        mockAgent as any,
        vcStore,
        {}, // No default issuer
        mockLogger as Logger
      );
      
      const result = await serviceWithoutIssuer.issueVC(sampleSubject, sampleTypes);
      
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toContain('No issuer DID specified');
    });
    
    it('should fail if issuer DID is not found', async () => {
      // Mock DID not found
      mockAgent.didManagerGet.mockRejectedValue(new Error('DID not found'));
      
      const result = await vcService.issueVC(sampleSubject, sampleTypes);
      
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toContain('Error retrieving issuer DID');
    });
    
    it('should fail if credential creation fails', async () => {
      // Mock credential creation failure
      mockAgent.createVerifiableCredential.mockRejectedValue(
        new Error('Invalid credential data')
      );
      
      const result = await vcService.issueVC(sampleSubject, sampleTypes);
      
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toContain('Error creating verifiable credential');
    });
  });

  describe('verifyVC', () => {
    it('should verify a valid credential', async () => {
      const result = await vcService.verifyVC(sampleVC);
      
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(true);
      
      // Verify agent was called correctly
      expect(mockAgent.verifyCredential).toHaveBeenCalledWith({
        credential: sampleVC
      });
    });
    
    it('should fail for invalid credentials', async () => {
      // Mock verification failure
      mockAgent.verifyCredential.mockResolvedValue({
        verified: false,
        error: 'Invalid signature'
      });
      
      const result = await vcService.verifyVC(sampleVC);
      
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toContain('Credential verification failed');
      expect(result.errorMessage).toContain('Invalid signature');
    });
    
    it('should handle verification errors', async () => {
      // Mock verification error
      mockAgent.verifyCredential.mockRejectedValue(
        new Error('Verification process failed')
      );
      
      const result = await vcService.verifyVC(sampleVC);
      
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toContain('Error verifying credential');
    });
  });

  describe('getVC', () => {
    it('should retrieve a stored credential by ID', async () => {
      // Store a credential first
  
      await vcStore.create('test', sampleVC);

      const result = await vcService.getVC('test');

 
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(sampleVC);
    });
    
    it('should return null for non-existent credentials', async () => {
      const result = await vcService.getVC('non-existent-id');
      
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });
    
    it('should fail if storage is not configured', async () => {
      // Create service without storage
      const serviceWithoutStorage = new VCService(
        mockAgent as any,
        undefined,
        { defaultIssuerDid: sampleDid },
        mockLogger as Logger
      );
      
      const result = await serviceWithoutStorage.getVC(sampleCredentialId);
      
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toContain('Storage not configured');
    });
  });

  describe('listVCs', () => {
    it('should list all stored credentials', async () => {
      // Store multiple credentials using full IDs (VCService now stores with full ID)
    
      const secondVC = {
        ...sampleVC,
        id: 'urn:uuid:987-different-id',
        credentialSubject: { ...sampleSubject, name: 'Jane Smith' }
      };
      
      await vcStore.create(sampleCredentialId, sampleVC);
      await vcStore.create(secondVC.id, secondVC);
      
      const result = await vcService.listVCs();
      
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value).toContainEqual(sampleVC);
      expect(result.value).toContainEqual(secondVC);
    });
    
    it('should return empty array when no credentials exist', async () => {
      const result = await vcService.listVCs();
      
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
    });
    
    it('should fail if storage is not configured', async () => {
      // Create service without storage
      const serviceWithoutStorage = new VCService(
        mockAgent as any,
        undefined,
        { defaultIssuerDid: sampleDid },
        mockLogger as Logger
      );
      
      const result = await serviceWithoutStorage.listVCs();
      
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toContain('Storage not configured');
    });
  });

  describe('deleteVC', () => {
    it('should delete a stored credential by ID', async () => {
      // Store a credential first using full ID (VCService now uses full ID for storage)
      await vcStore.create(sampleCredentialId, sampleVC);

      // Verify it exists
      expect(await vcStore.exists(sampleCredentialId)).toBe(true);
      
      // Delete it using full ID
      const result = await vcService.deleteVC(sampleCredentialId);
      
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(true);
      
      // Verify it's gone
      expect(await vcStore.exists(sampleCredentialId)).toBe(false);
    });
    
    it('should return false when deleting non-existent credentials', async () => {
      const result = await vcService.deleteVC('non-existent-id');
      
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(false);
    });
    
   
  });

  describe('e2e flow', () => {
    it('should support the full credential lifecycle', async () => {
      // 1. Issue a credential
      const issueResult = await vcService.issueVC(
        { ...sampleSubject, id: 'did:example:123' },
        [...sampleTypes, 'EmailCredential'],
        sampleDid, // Explicitly provide issuer DID
        {
          context: sampleContext,
          vcId: sampleCredentialId
        }               
      );
      
      expect(issueResult.isSuccess).toBe(true);

      const issuedVC = issueResult.value as SynetVerifiableCredential;
   
      const vcId = typeof issuedVC === 'string' ? issuedVC : issuedVC.id || sampleCredentialId;
      
      // 2. Verify the credential
      const verifyResult = await vcService.verifyVC(issuedVC);
      expect(verifyResult.isSuccess).toBe(true);
      expect(verifyResult.value).toBe(true);
      
    
      // 3. Get the credential by ID
      const getResult = await vcService.getVC(vcId);


      expect(getResult.isSuccess).toBe(true);
      expect(getResult.value).toEqual(issuedVC);
      
      // 4. List all credentials
      const listResult = await vcService.listVCs();

      expect(listResult.isSuccess).toBe(true);
      expect(listResult.value).toContainEqual(issuedVC);
      
      // 5. Delete the credential
      const deleteResult = await vcService.deleteVC(vcId);
      expect(deleteResult.isSuccess).toBe(true);
      expect(deleteResult.value).toBe(true);
      
      // 6. Verify it's gone
      const getAfterDeleteResult = await vcService.getVC(vcId);
      expect(getAfterDeleteResult.isSuccess).toBe(true);
      expect(getAfterDeleteResult.value).toBeNull();
    });
  });
});