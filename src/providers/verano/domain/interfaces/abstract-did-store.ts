import type { IIdentifier } from '@synet/identity-core'


export abstract class AbstractDIDStore {
  abstract importDID(args: IIdentifier): Promise<boolean>
  abstract getDID(args: { did: string }): Promise<IIdentifier>
  abstract getDID(args: { alias: string }): Promise<IIdentifier>
  abstract deleteDID(args: { did: string }): Promise<boolean>
  abstract listDIDs(args: { alias?: string; provider?: string }): Promise<IIdentifier[]>
}