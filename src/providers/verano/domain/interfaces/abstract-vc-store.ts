import type { SynetVerifiableCredential } from "@synet/credentials";

export interface AbstractVCStore  { 
  /**
   * File-based Verifiable Credential store implementation
   * @param dir Directory to store VC files
   * @param fs File system interface for file operations
   */
  exists(id: string): Promise<boolean>;
  create(id:string,item: SynetVerifiableCredential): Promise<void>;
  get(id: string): Promise<SynetVerifiableCredential | null>;
  delete(id: string): Promise<boolean>;
  list(): Promise<SynetVerifiableCredential[]>;

}
