// application/use-cases/index.ts
import type { Dependencies } from './types';
import { makeCredentialUseCases } from './credentials';
//import { makeDidUseCases } from './did';
//import { makeKeyUseCases } from './keys';

export type AppUseCases = ReturnType<typeof makeAppUseCases>;

export const makeAppUseCases = (deps: Dependencies) => ({
  credentials: makeCredentialUseCases(deps),
  //did: makeDidUseCases(deps),
  //keys: makeKeyUseCases(deps),
});

export type { Dependencies } from './types';