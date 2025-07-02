// application/use-cases/key/index.ts
import type { Dependencies } from '../../common/types/dependencies';
import { createKeyCommand } from './commands/create-key.command';
import { deleteKeyCommand } from './commands/delete-key.command';
import { getKeyQuery } from './queries/get-key.query';
import type { KeyDependencies } from './types';

export type KeyUseCases = ReturnType<typeof makeKeyUseCases>;

export const makeKeyUseCases = (deps: Dependencies) => {
  
  const keyDeps: KeyDependencies = {
    keyService: deps.keyService,
    vaultOperator: deps.vaultOperator,
    logger: deps.logger
  };

  return {
    queries: {
      getKey: getKeyQuery(keyDeps),
    },
    commands: {
      create: createKeyCommand(keyDeps).execute,
      delete: deleteKeyCommand(keyDeps).execute,
    }
  };
};
