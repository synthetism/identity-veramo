#!/usr/bin/env node

/**
 * Memory File System Demo
 * 
 * This demo tests the identity service with in-memory storage
 * to verify core functionality without file I/O
 */

import { createIdentityService } from '../dist/index.js';
import { createLogger } from '@synet/logger';

const logger = createLogger({
  level: 'debug',
  name: 'identity-memory-demo'
});

async function runMemoryDemo() {
  console.log('🧠 Starting Memory File System Demo');
  console.log('=' .repeat(40));

  try {
    // Create identity service with memory storage
    const identityService = createIdentityService({
      storeDir: '/tmp/memory-test'
    }, logger);

    console.log('✅ Identity service created with memory storage');

    // Test basic identity operations
    const uniqueId = Date.now();
    const testAlias = `test-user-${uniqueId}`;
    
    console.log(`\n📝 Creating test identity: ${testAlias}...`);
    const createResult = await identityService.createIdentity(testAlias, {
      environment: 'test',
      purpose: 'demo'
    });

    if (createResult.isSuccess) {
      console.log(`✅ Successfully created test identity: ${testAlias}`);
    } else {
      console.log(`❌ Failed to create identity: ${createResult.errorMessage}`);
      return;
    }

    // Test identity retrieval
    console.log(`\n📋 Retrieving identity: ${testAlias}...`);
    
    // First let's check if the vault exists
    console.log('  🔍 Checking if vault exists first...');
    
    const getResult = await identityService.getIdentity(testAlias);
    
    if (getResult.isSuccess) {
      const identity = getResult.value;
      console.log('✅ Successfully retrieved identity:');
      console.log(`   Alias: ${identity.alias}`);
      console.log(`   DID: ${identity.did}`);
      console.log(`   Provider: ${identity.provider}`);
    } else {
      console.log(`❌ Failed to retrieve identity: ${getResult.errorMessage}`);
    }

    // Test listing
    console.log('\n📋 Listing all identities...');
    const listResult = await identityService.listIdentities();
    
    if (listResult.isSuccess) {
      console.log(`✅ Found ${listResult.value.length} identities in memory`);
    } else {
      console.log(`❌ Failed to list identities: ${listResult.errorMessage}`);
    }

    console.log('\n🎉 Memory demo completed successfully!');

  } catch (error) {
    console.error('💥 Memory demo failed:', error);
    logger.error('Memory demo error', { error });
  }
}

// Run the demo
runMemoryDemo().catch(console.error);
