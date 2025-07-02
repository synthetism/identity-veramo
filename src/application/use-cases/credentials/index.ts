// application/use-cases/credentials/index.ts
import type { Dependencies } from '../types';
import { issueCredentialCommand } from './commands/issue-credential.command';
import { storeCredentialCommand } from './commands/store-credential.command';
import { getCredentialQuery } from './queries/get-credential.query';
import { listCredentialsQuery } from './queries/list-credentials.query';

export const makeCredentialUseCases = (deps: Dependencies) => {
  
  const credentialDeps = {
    vcService: deps.vcService,
    vaultOperator: deps.vaultOperator,
    logger: deps.logger
  };

  return {
    queries: {
      getCredential: getCredentialQuery(credentialDeps),
      listCredentials: listCredentialsQuery(credentialDeps),
    },
    commands: {
      issue: issueCredentialCommand(credentialDeps).execute,
      store: storeCredentialCommand(credentialDeps).execute,
    }
  };
};