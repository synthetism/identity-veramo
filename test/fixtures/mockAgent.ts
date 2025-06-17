import { vi } from 'vitest';



export  const mockAgent = {
    didManagerGet: vi.fn(),
    createVerifiableCredential: vi.fn(),
    verifyCredential: vi.fn()
  };
