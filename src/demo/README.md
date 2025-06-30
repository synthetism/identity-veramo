# Identity Service Demos

This directory contains demonstration scripts for the `@synet/identity` package, showcasing the complete identity lifecycle and vault integration.

## Available Demos

### 1. Memory Demo (`memory-demo.js`)
- **Purpose**: Tests core functionality with in-memory storage
- **Features**: Basic identity creation, retrieval, and listing
- **Use Case**: Quick verification without file I/O

### 2. Basic Demo (`basic-demo.js`)
- **Purpose**: Comprehensive test of all identity operations with file system storage
- **Features**:
  - Identity creation with metadata
  - Listing all identities
  - Getting identity details
  - Retrieving public keys
  - Renaming identities
  - File system verification
  - Identity deletion
- **Use Case**: Full integration testing

## Running Demos

### Run All Demos
```bash
npm run demo
# or
node demo/run-demos.js
```

### Run Individual Demos
```bash
# Memory demo
node demo/memory-demo.js

# Basic demo  
node demo/basic-demo.js
```

## What the Demos Test

### Identity Service Core Features
- ✅ **Identity Creation**: Multi-step process involving Veramo providers
- ✅ **Vault Storage**: Proper vault creation and data storage
- ✅ **Identity Retrieval**: By alias and DID
- ✅ **Identity Listing**: All identities in vault
- ✅ **Identity Management**: Rename and delete operations
- ✅ **Key Management**: Public key retrieval by type
- ✅ **File System Integration**: Both memory and disk storage

### Vault System Integration
- ✅ **Vault Creation**: Automatic vault creation for new identities
- ✅ **Event Emitter**: Folder switching via vault-core events
- ✅ **Storage Adapters**: Veramo adapter integration
- ✅ **Data Persistence**: Proper file structure creation

### Error Handling
- ✅ **Graceful Failures**: Proper error messages and Result patterns
- ✅ **File System Errors**: Handling of invalid paths and permissions
- ✅ **Non-existent Resources**: Proper handling of missing identities

## Demo Output

### Success Indicators
When demos run successfully, you should see:
- ✅ Identity service creation
- ✅ All identity operations completing
- 📁 Vault directory structure creation
- 🎉 Completion messages

### Vault Structure
After running demos, check the created directories:
```
/tmp/synet-identity-demo/{timestamp}/
├── alice/          # Individual identity vaults
├── bob/
├── charles/
└── ...
```

Each vault contains:
- Identity metadata
- Cryptographic keys
- DID documents
- Verifiable credentials

## Troubleshooting

### Common Issues

**Permission Errors**
```bash
# Make scripts executable
chmod +x demo/*.js
```

**Missing Dependencies**
```bash
# Install dependencies
npm install
```

**TypeScript Errors**
```bash
# Build the package first
npm run build
```

**Vault Errors**
- Check write permissions to `/tmp`
- Ensure sufficient disk space
- Verify no conflicting processes

### Debug Mode
Enable debug logging by setting environment variables:
```bash
DEBUG=synet:* node demo/basic-demo.js
```

## Integration with Tests

These demos serve as the foundation for the integration tests in `/test/integration/`. If demos work correctly, the tests should pass.

### Running Tests After Demos
```bash
# Run integration tests
npm test

# Run with coverage
npm run coverage

# Run specific test files
npm test -- identity-service.test.ts
```

## File System Types

The demos test both file system implementations:

- **NodeFileSystem**: Real disk I/O for production scenarios
- **MemFileSystem**: In-memory storage for testing and development

## Next Steps

After running demos successfully:

1. ✅ **Run Tests**: Execute the test suite to verify functionality
2. 🔍 **Inspect Vaults**: Examine the created vault structures
3. 🔧 **Modify Code**: Make changes and re-run to test
4. 📊 **Performance**: Use demos as benchmarks for optimization
5. 🚀 **Integration**: Integrate into your application

---

*Part of the `@synet/identity` package test suite.*
