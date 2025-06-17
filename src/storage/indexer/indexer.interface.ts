/**
 * Interface for a generic indexer
*/

export interface IIndexer<T> {
  exists(): boolean;
  create(entry: T): void;
  get(idOrAlias: string): T | null;
  find(keyword: string): T | null;
  delete(idOrAlias: string): boolean;
  list(): T[];
  rebuild(entries: T[]): void;
}
