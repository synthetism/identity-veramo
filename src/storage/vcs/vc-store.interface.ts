
export interface IVCStore<T>  {
  /**
   * File-based Verifiable Credential store implementation
   * @param dir Directory to store VC files
   * @param fs File system interface for file operations
   */
  exists(id: string): Promise<boolean>;
  create(id: string, item: T): Promise<void>;
  get(id: string): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  list(): Promise<T[]>;

}
