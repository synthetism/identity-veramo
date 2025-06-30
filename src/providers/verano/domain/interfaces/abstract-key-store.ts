import type { IKey, ManagedKeyInfo } from '@synet/identity-core'

export abstract class AbstractKeyStore {
  abstract importKey(args: Partial<IKey>): Promise<boolean>

  abstract getKey(args: { kid: string }): Promise<IKey>

  abstract deleteKey(args: { kid: string }): Promise<boolean>

  abstract listKeys(args: Record<string, never>): Promise<Array<ManagedKeyInfo>>
}