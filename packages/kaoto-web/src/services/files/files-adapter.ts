export type EntryKind = 'file' | 'folder';

/** A file or folder as a storage lists it */
export interface AdapterEntry {
  kind: EntryKind;
  /** `/`-separated, without a leading or trailing `/`, e.g. `routes/my-route.camel.yaml` */
  path: string;
}

/**
 * Reaches one storage of a project's files and folders: the browser storage today, a Git repository or a local
 * checkout later.
 *
 * It speaks paths only, as Git and file systems have nothing else to name an entry by. Every method rejects when the
 * storage refuses the change (not always with an `Error`: IndexedDB rejects with a `DOMException`, which only some
 * environments derive from `Error`), and a refused change leaves the storage as it was.
 */
export interface FilesAdapter {
  /** Every file and folder, including empty folders */
  list(): Promise<AdapterEntry[]>;
  /** Rejects when there is no file at the path */
  readFile(path: string): Promise<string>;
  /** Rejects when there is no file at the path */
  writeFile(path: string, content: string): Promise<void>;
  /** Creates the missing parent folders; rejects when the path is taken or a parent is a file */
  createFile(path: string, content: string): Promise<void>;
  /** Creates the missing parent folders of the target; rejects when there is no file at `from` or `to` is taken */
  moveFile(from: string, to: string): Promise<void>;
  /** Rejects when there is no file at the path */
  removeFile(path: string): Promise<void>;
  /** Keeps the folder also while it is empty; creates the missing parent folders; rejects when the path is taken */
  createFolder(path: string): Promise<void>;
  /**
   * Moves the folder with everything under it, all or nothing. Rejects when there is no folder at `from`, `to` is
   * taken or lies inside the folder itself
   */
  moveFolder(from: string, to: string): Promise<void>;
  /** Removes the folder with everything under it, all or nothing; rejects when a file is at the path */
  removeFolder(path: string): Promise<void>;
}
