import { EntryKind } from '../../services/files/files-storage';

/** A file or folder of the project */
export interface FileEntry {
  /** A UUID the store assigns; stable for the session, also across moves, and independent of the storage */
  key: string;
  kind: EntryKind;
  /** `/`-separated, without a leading or trailing `/`, e.g. `routes/my-route.camel.yaml` */
  path: string;
  /** The last segment of the path */
  name: string;
}

export interface FilesState {
  /** Sorted by path */
  entries: FileEntry[];
  status: 'loading' | 'ready' | 'error';
  error: Error | undefined;

  /** Loads the list from the storage; the entries get new keys */
  load(): Promise<void>;

  /** Stores a new file; resolves with its entry. Missing parent folders are created along */
  addFile(path: string, content: string): Promise<FileEntry>;
  /** Moves the file; resolves with its entry, which keeps its key */
  moveFile(key: string, newPath: string): Promise<FileEntry>;
  removeFile(key: string): Promise<void>;

  /** Stores a new folder, also while it is empty; resolves with its entry */
  addFolder(path: string): Promise<FileEntry>;
  /** Moves the folder with every entry under it; all of them keep their keys */
  moveFolder(key: string, newPath: string): Promise<void>;
  /** Removes the folder with every entry under it */
  removeFolder(key: string): Promise<void>;

  /** Reads the content from the storage; the store never keeps it */
  getFileContent(key: string): Promise<string>;
  /** Writes the content to the storage */
  setFileContent(key: string, content: string): Promise<void>;
}
