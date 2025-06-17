  import { vi } from 'vitest';
  import type { Logger } from '@synet/logger';

  export const mockLogger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    child: vi.fn(() => mockLogger),
  };