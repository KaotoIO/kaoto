import { createContext } from 'react';

import { NewFile, StoredFile } from '../services/files/stored-file';

export interface IFilesContext {
  files: StoredFile[];
  /** The folders the user created, sorted by path; folders that hold files also exist through the file paths */
  folders: string[];
  loading: boolean;
  error: Error | undefined;
  /** Loads the files again, e.g. after the browser storage was blocked */
  reload: () => void;
  /** Adds the file to the store; the files show it once it is stored. Rejects when the path is taken */
  createFile: (file: NewFile) => Promise<StoredFile>;
  /** Keeps the folder in the store; the folders show it once it is stored. Rejects when it was created before */
  createFolder: (folderPath: string) => Promise<void>;
  /** Writes the content to the store; the files show it once it is stored */
  updateFile: (id: string, content: string) => Promise<void>;
  /** Moves the file to the path; the files show it once it is stored. Rejects when the path is taken */
  renameFile: (id: string, path: string) => Promise<void>;
  /** Removes the file from the store; the files drop it once it is deleted */
  deleteFile: (id: string) => Promise<void>;
  /** Removes the folder and every file and folder under it from the store; they are dropped once deleted */
  deleteFolder: (folderPath: string) => Promise<void>;
}

export const FilesContext = createContext<IFilesContext | undefined>(undefined);
