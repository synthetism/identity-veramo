#!/usr/bin/env node

/**
 * Demo Runner
 * 
 * Runs all the identity demos in sequence
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎭 Running Identity Service Demos');
console.log('=' .repeat(50));

async function runDemo(scriptPath, name) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Starting ${name}...`);
    console.log('-' .repeat(30));
    
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: __dirname
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${name} completed successfully\n`);
        resolve(code);
      } else {
        console.log(`\n❌ ${name} failed with exit code ${code}\n`);
        reject(new Error(`${name} failed`));
      }
    });

    child.on('error', (error) => {
      console.error(`\n💥 ${name} failed to start:`, error);
      reject(error);
    });
  });
}

async function runAllDemos() {
  const demos = [
    {
      script: path.join(__dirname, 'memory-demo.js'),
      name: 'Memory File System Demo'
    },
    {
      script: path.join(__dirname, 'basic-demo.js'),
      name: 'Basic Identity Demo'
    }
  ];

  try {
    for (const demo of demos) {
      await runDemo(demo.script, demo.name);
    }
    
    console.log('🎉 All demos completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run the tests: npm test');
    console.log('   2. Check the demo output directories');
    console.log('   3. Inspect the vault structure');
    
  } catch (error) {
    console.error('💥 Demo runner failed:', error.message);
    process.exit(1);
  }
}

runAllDemos().catch(console.error);
