// application/use-cases/index.ts
import type { Dependencies } from '../common/types/dependencies';
import { makeCredentialUseCases } from './credentials';
import { makeDidUseCases } from './did';
import { makeKeyUseCases } from './key';


export type UseCases = ReturnType<typeof makeUseCases>;

export const makeUseCases = (deps: Dependencies) => {
  return {
    credentials: makeCredentialUseCases(deps),
    did: makeDidUseCases(deps),
    key: makeKeyUseCases(deps),
  };
};

// Re-export individual makers for convenience

export { makeCredentialUseCases } from './credentials';
export { makeDidUseCases } from './did';
export { makeKeyUseCases } from './key';
export type { Dependencies } from '../common/types/dependencies';
