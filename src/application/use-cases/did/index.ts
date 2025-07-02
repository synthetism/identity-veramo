// application/use-cases/did/index.ts
export const makeDidUseCases = (deps: Dependencies) => {
  const didDeps = {
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