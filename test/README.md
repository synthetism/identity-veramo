# Identity Service Testing Guide

## Overview

This package includes comprehensive testing for the `@synet/identity` service, covering both demos and automated tests to ensure proper functionality across all components.

## Test Structure

```
test/
├── integration/           # Integration tests
│   ├── identity-service.test.ts      # Core service tests
│   └── complete-workflow.test.ts     # End-to-end workflow tests
├── unit/                 # Unit tests
│   └── vc-service.test.ts           # VC service specific tests
└── setup-test-env.ts     # Test environment setup

demo/
├── basic-demo.js         # Complete demo with file system
├── memory-demo.js        # Quick in-memory demo
├── run-demos.js         # Demo runner script
└── README.md            # Demo documentation
```

## Running Tests

### Quick Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run coverage

# Run only integration tests
npm run test:integration

# Run only unit tests  
npm run test:unit

# Watch mode for development
npm run dev:test
```

### Demo Commands

```bash
# Run all demos
npm run demo

# Run specific demos
npm run demo:memory
npm run demo:basic
```

## Test Categories

### 1. Integration Tests (`/test/integration/`)

**identity-service.test.ts**
- ✅ Identity creation with vault storage
- ✅ Identity retrieval by alias and DID
- ✅ Identity listing and management
- ✅ Identity renaming and deletion
- ✅ Public key retrieval
- ✅ File system integration
- ✅ Error handling

**complete-workflow.test.ts**
- ✅ End-to-end identity lifecycle
- ✅ Multi-identity scenarios
- ✅ Vault integrity across operations
- ✅ Error recovery and edge cases
- ✅ Rapid successive operations
- ✅ Consistency after failed operations

### 2. Unit Tests (`/test/unit/`)

**vc-service.test.ts**
- ✅ Verifiable Credential issuance
- ✅ Credential verification
- ✅ Error handling for invalid inputs
- ✅ Service method availability

### 3. Demos (`/demo/`)

**memory-demo.js**
- ✅ Quick verification with in-memory storage
- ✅ Basic identity operations
- ✅ Service initialization

**basic-demo.js**
- ✅ Full identity lifecycle with file system
- ✅ Vault directory structure verification
- ✅ All identity management operations
- ✅ Error scenarios and recovery

## Test Flow

### Recommended Testing Sequence

1. **Build the package**: `npm run build`
2. **Run memory demo**: `npm run demo:memory`
3. **Run basic demo**: `npm run demo:basic`
4. **Run unit tests**: `npm run test:unit`
5. **Run integration tests**: `npm run test:integration`
6. **Run full test suite**: `npm test`

### Development Workflow

```bash
# During development - watch mode
npm run dev:test

# Before committing - full validation
npm run demo && npm test && npm run coverage
```

## What Gets Tested

### Core Identity Operations
- [x] **Identity Creation**: Full Veramo provider integration
- [x] **Vault Storage**: Proper vault creation and file structure
- [x] **Identity Retrieval**: By alias and DID with validation
- [x] **Identity Listing**: All identities from vault system
- [x] **Identity Management**: Rename and delete operations
- [x] **Key Management**: Public key retrieval and validation

### Vault System Integration
- [x] **Multi-Vault Support**: Multiple identities in separate vaults
- [x] **Event Emitter Integration**: Folder switching via vault-core
- [x] **Storage Adapters**: Veramo adapter filesystem integration
- [x] **Data Persistence**: File structure and data integrity

### Error Handling & Edge Cases
- [x] **Graceful Failures**: Proper Result pattern usage
- [x] **Invalid Operations**: Non-existent resource handling
- [x] **File System Errors**: Permission and path issues
- [x] **Concurrent Operations**: Rapid successive calls
- [x] **Data Consistency**: Recovery after failed operations

### File System Support
- [x] **NodeFileSystem**: Real disk I/O operations
- [x] **MemFileSystem**: In-memory testing
- [x] **Directory Operations**: Creation, reading, deletion
- [x] **File Persistence**: Proper vault file structure

## Test Data and Cleanup

### Temporary Directories
Tests use unique temporary directories to avoid conflicts:
- Pattern: `/tmp/synet-{test-type}-{timestamp}/`
- Auto-cleanup after each test
- Isolation between test runs

### Test Identities
Standard test identities used across tests:
- `alice`, `bob`, `charlie` - Basic functionality
- `test-user`, `workflow-user` - Specific scenarios
- `admin-user`, `regular-user`, `guest-user` - Multi-identity tests

## Troubleshooting Tests

### Common Issues

**Build Errors**
```bash
# Clean and rebuild
npm run clean && npm run build
```

**Test Failures**
```bash
# Run individual test files
npx vitest run test/integration/identity-service.test.ts
```

**Demo Failures**
```bash
# Check demo output directly
node demo/basic-demo.js
```

**File Permission Issues**
```bash
# Ensure temp directory is writable
ls -la /tmp/
```

**Dependency Issues**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode

Enable detailed logging:
```bash
DEBUG=synet:* npm test
DEBUG=synet:* npm run demo
```

### Manual Verification

After tests pass, manually inspect:
```bash
# Check a demo output directory
ls -la /tmp/synet-identity-demo-*/

# Verify vault structure
find /tmp/synet-identity-demo-* -type f
```

## CI/CD Integration

For continuous integration, use:
```bash
# Full validation pipeline
npm run lint && npm run build && npm run demo && npm test && npm run coverage
```

## Performance Considerations

### Test Execution Time
- Unit tests: ~1-2 seconds
- Integration tests: ~5-10 seconds
- Demos: ~10-15 seconds
- Full suite: ~20-30 seconds

### Resource Usage
- Memory: ~50-100MB during tests
- Disk: ~10-50MB for temporary files
- Cleanup: Automatic after each test

---

*Part of the `@synet/identity` package quality assurance.*
