import type { CommandBus, QueryMediator } from '@synet/patterns';
import { Result } from '@synet/patterns';
import type { SynetVerifiableCredential, BaseCredentialSubject } from '@synet/credentials';
import type { 
    IssueCredentialCommand,
    StoreCredentialCommand
} from './commands/issue-credential.command';

import type { 
    GetCredentialQuery
} from './handlers/get-credential.query';


export interface IVerifiableCredentialService {
  // Commands - write operations
  issueCredential(command: IssueCredentialCommand): Promise<Result<SynetVerifiableCredential>>;
  storeCredential(command: StoreCredentialCommand): Promise<Result<void>>;
  //revokeCredential(command: RevokeCredentialCommand): Promise<Result<void>>;
  
  // Queries - read operations  
  getCredential(query: GetCredentialQuery): Promise<Result<SynetVerifiableCredential | null>>;
  //listCredentials(query: ListCredentialsQuery): Promise<Result<SynetVerifiableCredential[]>>;
  //verifyCredential(query: VerifyCredentialQuery): Promise<Result<boolean>>;
}

export class VerifiableCredentialService implements IVerifiableCredentialService {
  constructor(
    private commandBus: CommandBus,
    private queryMediator: QueryMediator
  ) {}

  async issueCredential(command: IssueCredentialCommand): Promise<Result<SynetVerifiableCredential>> {
    try {
      const vc = await this.commandBus.dispatch<SynetVerifiableCredential>(command);

      return Result.success(vc);

    } catch (error) {
      return Result.fail(`Failed to issue credential: ${error}`);
    }
  }

  async storeCredential(command: StoreCredentialCommand): Promise<Result<void>> {
    try {
      await this.commandBus.dispatch(command);
      return Result.success(undefined);
    } catch (error) {
      return Result.fail(`Failed to store credential: ${error}`);
    }
  }

  async getCredential(query: GetCredentialQuery): Promise<Result<SynetVerifiableCredential>> {
    try {
      const vc = await this.queryMediator.query<SynetVerifiableCredential>(query);

      return Result.success(vc);

    } catch (error) {
      return Result.fail(`Failed to get credential: ${error}`);
    }
  }

}