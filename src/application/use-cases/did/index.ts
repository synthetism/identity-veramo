// application/use-cases/did/index.ts
import type { Dependencies } from '../../common/types/dependencies';
import { createDidCommand } from './commands/create-did.command';
import { updateDidCommand } from './commands/update-did.command';
import { getDidQuery } from './queries/get-did.query';
import { findDidsQuery } from './queries/find-dids.query';
import type { DidDependencies } from './types';

export type DidUseCases = ReturnType<typeof makeDidUseCases>;

export const makeDidUseCases = (deps: Dependencies) => {

  const didDeps: DidDependencies = {
    didService: deps.didService,
    vaultOperator: deps.vaultOperator,
    logger: deps.logger
  };

  return {
    queries: {
      getDid: getDidQuery(didDeps),
      findDids: findDidsQuery(didDeps),
    },
    commands: {
      create: createDidCommand(didDeps).execute,
      update: updateDidCommand(didDeps).execute,
    }
  };
};