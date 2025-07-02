// application/use-cases/credentials/index.ts
import type { Dependencies } from '../../common/types/dependencies';
import { issueCredentialCommand } from './commands/issue-credential.command';
import { storeCredentialCommand } from './commands/store-credential.command';
import { getCredentialQuery } from './queries/get-credential.query';
import { listCredentialsQuery } from './queries/list-credentials.query';
import type { CredentialgDependencies } from './types';

export type credentialUseCases = ReturnType<typeof makeCredentialUseCases>;

export const makeCredentialUseCases = (deps: Dependencies) => {
  
  const credentialDeps: CredentialgDependencies = {
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