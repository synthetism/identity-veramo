// application/index.ts
import type { Dependencies } from './common/types/dependencies';
import { makeUseCases } from './use-cases';

export type AppUseCases = ReturnType<typeof makeUseCases>;

export const makeAppUseCases = (deps: Dependencies) => makeUseCases(deps);

export type { Dependencies } from './common/types/dependencies';