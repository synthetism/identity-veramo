/**
 * File system abstraction interface
 */
export interface IFileSystem {
  /**
   * Check if a file exists
   * @param path Path to check
   */

  exists(path: string): Promise<boolean>;

  /**
   * Synchronously check if a file exists
   * @param path Path to check
   */
  existsSync(path: string): boolean;

  /**
   * Read a file as text
   * @param path File path
   */
  readFile(path: string): Promise<string>;

  /**
   * Synchronously read a file as text
   * @param path File path
   */
  readFileSync(path: string): string;
  /**
   * Write text to a file
   * @param path File path
   * @param data Data to write
   */
  writeFile(path: string, data: string): Promise<void>;

  /**
   * Delete a file
   * @param path File path
   */
  deleteFile(path: string): Promise<void>;

  /**
   *  Synchronously delete a directory
   * @param path Directory path
   */
  deleteDir(path: string): Promise<void>;
  /**
   * Read a directory and return its contents
   * @param dirPath Directory path
   */
  readDir(dirPath: string): Promise<string[]>;

  /**
   *  Synchronously read a directory and return its contents
   * @param dirPath Directory path
   * @returns Synchronously read a directory and return its contents
   * @throws Error if the directory does not exist or cannot be read
   */

  readDirSync(dirPath: string): string[];

  /**
   * Ensure a directory exists
   * @param path Directory path
   */
  ensureDir(path: string): Promise<void>;

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
  chmod(path: string, mode: number): Promise<void>;

  /**
   * Clear the contents of a directory (optional)
   * @param dirPath Directory path
   */
  clear?(dirPath: string): Promise<void>;
}
