
/**
 * Asynchronous Storage interface
 */
export interface IStorage<T>  {
  
  exists(id: string): Promise<boolean>;
  create(id:string,data: T): Promise<void>;
  get(id: string): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  list(): Promise<T[]>;
  update?(id: string, data: Partial<T>): Promise<void>;
  
}