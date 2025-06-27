/**
 * File system abstraction interface
 */
export interface IFileSystem {

  /**
   * Synchronously check if a file exists
   * @param path Path to check
   */
  existsSync(path: string): boolean;

  /**
   * Read a file as text
   * @param path File path
   */
  readFileSync(path: string): string;
  
  /**
   * Write text to a file
   * @param path File path
   * @param data Data to write
   */
  writeFileSync(path: string, data: string): void;

  /**
   * Delete a file
   * @param path File path
   */
  deleteFileSync(path: string): void;

  /**
   *  Synchronously delete a directory
   * @param path Directory path
   */
  deleteDirSync(path: string): void;
  /**
   * Read a directory and return its contents
   * @param dirPath Directory path
   */
  readDirSync(dirPath: string): string[];

  /**
   * Ensure a directory exists
   * @param path Directory path
   */
  ensureDirSync(path: string): void;

  /**
   * Synchronously ensure a directory exists
   * @param path Directory path
   */
  ensureDirSync(path: string): void;

  /**
   * Set file permissions
   * @param path File path
   * @param mode Permission mode (octal)
   */
  chmodSync(path: string, mode: number): void;

  /**
   * Clear the contents of a directory (optional)
   * @param dirPath Directory path
   */
  clear?(dirPath: string): void;
}
