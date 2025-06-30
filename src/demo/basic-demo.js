#!/usr/bin/env node

/**
 * Identity Service Demo
 * 
 * This demo showcases the complete identity lifecycle:
 * 1. Creating identities with vault storage
 * 2. Listing identities
 * 3. Getting identity details
 * 4. Deleting identities
 * 5. File system verification
 */

import { createIdentityService } from '../../dist/index.js';
import { createLogger } from '@synet/logger';
import path from 'node:path';
import os from 'node:os';
import { NodeFileSystem } from '@synet/fs/promises';

const logger = createLogger({
  level: 'debug',
  name: 'identity-demo'
});

async function runDemo() {
  console.log('🚀 Starting Identity Service Demo');
  console.log('=' .repeat(50));

  // Create a demo directory
  const demoDir = path.join(os.homedir(), 'synet-identity-demo', Date.now().toString());
  console.log(`📁 Demo directory: ${demoDir}`);

  // Create identity service
  const identityService = createIdentityService({
    storeDir: demoDir
  }, logger);

  console.log('✅ Identity service created');

  try {
    // Test 1: Create multiple identities
    console.log('\n📝 Test 1: Creating identities...');
    
    const identities = [
      { alias: 'alice', meta: { purpose: 'main-identity' } },
      { alias: 'bob', meta: { purpose: 'test-identity' } },
      { alias: 'charlie', meta: { purpose: 'backup-identity' } }
    ];

    for (const { alias, meta } of identities) {
      console.log(`  Creating identity: ${alias}`);
      const result = await identityService.createIdentity(alias, meta);
      
      if (result.isSuccess) {
        console.log(`  ✅ Created identity: ${alias}`);
      } else {
        console.log(`  ❌ Failed to create identity ${alias}: ${result.errorMessage}`);
        return;
      }
    }

    // Test 2: List all identities
    console.log('\n📋 Test 2: Listing all identities...');
    const listResult = await identityService.listIdentities();
    
    if (listResult.isSuccess) {
      console.log(`  ✅ Found ${listResult.value.length} identities:`);
      listResult.value.forEach((identity, index) => {
        console.log(`  ${index + 1}. ${identity.alias} (${identity.did})`);
        console.log(`     Provider: ${identity.provider}`);
        console.log(`     Created: ${identity.createdAt.toISOString()}`);
      });
    } else {
      console.log(`  ❌ Failed to list identities: ${listResult.errorMessage}`);
    }

    // Test 3: Get specific identity details
    console.log('\n🔍 Test 3: Getting identity details...');
    const aliceResult = await identityService.getIdentity('alice');
    
    if (aliceResult.isSuccess) {
      const alice = aliceResult.value;
      console.log(`  ✅ Alice's identity:`);
      console.log(`     Alias: ${alice.alias}`);
      console.log(`     DID: ${alice.did}`);
      console.log(`     Key ID: ${alice.kid}`);
      console.log(`     Public Key: ${alice.publicKeyHex.substring(0, 20)}...`);
      console.log(`     Provider: ${alice.provider}`);
    } else {
      console.log(`  ❌ Failed to get Alice's identity: ${aliceResult.errorMessage}`);
    }

    // Test 4: Get detailed identity information
    console.log('\n🔧 Test 4: Getting detailed identity information...');
    const detailsResult = await identityService.getIdentityDetails('bob');
    
    if (detailsResult.isSuccess) {
      const details = detailsResult.value;
      console.log(`  ✅ Bob's detailed information:`);
      console.log(`     Identity alias: ${details.identity.alias}`);
      console.log(`     Number of keys: ${details.keys.length}`);
      details.keys.forEach((key, index) => {
        console.log(`     Key ${index + 1}: ${key.type} (${key.kid})`);
      });
    } else {
      console.log(`  ❌ Failed to get Bob's details: ${detailsResult.errorMessage}`);
    }

    // Test 5: Get public key
    console.log('\n🔑 Test 5: Getting public key...');
    const keyResult = await identityService.getPublicKey('charlie', 'Ed25519');
    
    if (keyResult.isSuccess && keyResult.value) {
      const key = keyResult.value;
      console.log(`  ✅ Charlie's public key:`);
      console.log(`     Type: ${key.type}`);
      console.log(`     Key ID: ${key.kid}`);
      console.log(`     Public Key: ${key.publicKeyHex.substring(0, 40)}...`);
    } else {
      console.log(`  ❌ Failed to get Charlie's key: ${keyResult.errorMessage || 'Key not found'}`);
    }

    // Test 6: Rename identity
    console.log('\n✏️  Test 6: Renaming identity...');
    const renameResult = await identityService.renameIdentity('charlie', 'charles');
    
    if (renameResult.isSuccess) {
      console.log('  ✅ Successfully renamed charlie to charles');
      
      // Verify the rename
      const charlesResult = await identityService.getIdentity('charles');
      if (charlesResult.isSuccess) {
        console.log(`  ✅ Verified: Charles exists with DID ${charlesResult.value.did}`);
      }
    } else {
      console.log(`  ❌ Failed to rename identity: ${renameResult.errorMessage}`);
    }

    // Test 7: File system verification
    console.log('\n💾 Test 7: File system verification...');
    const fs = new NodeFileSystem();
    
    try {
      // Check if vault directories exist
      const vaultExists = await fs.exists(demoDir);
      console.log(`  Vault directory exists: ${vaultExists ? '✅' : '❌'}`);
      
      if (vaultExists) {
        const files = await fs.readDir(demoDir);
        console.log(`  Vault contains ${files.length} items:`);
        for (const file of files) {
          console.log(`    📄 ${file}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ File system verification failed: ${error}`);
    }

    // Test 8: Delete identity
    console.log('\n🗑️  Test 8: Deleting identity...');
    const deleteResult = await identityService.deleteIdentity('bob');
    
    if (deleteResult.isSuccess) {
      console.log(`  ✅ Successfully deleted bob's identity`);
      
      // Verify deletion
      const listAfterDelete = await identityService.listIdentities();
      if (listAfterDelete.isSuccess) {
        console.log(`  ✅ Verified: Now have ${listAfterDelete.value.length} identities remaining`);
        for (const identity of listAfterDelete.value) {
          console.log(`    - ${identity.alias}`);
        }
      }
    } else {
      console.log(`  ❌ Failed to delete bob's identity: ${deleteResult.errorMessage}`);
    }

    console.log('\n🎉 Demo completed successfully!');
    console.log(`📁 Demo files are in: ${demoDir}`);
    console.log('💡 You can inspect the vault structure and files manually');

  } catch (error) {
    console.error('💥 Demo failed with error:', error);
    logger.error('Demo error', { error });
  }
}

// Run the demo
runDemo().catch(console.error);
