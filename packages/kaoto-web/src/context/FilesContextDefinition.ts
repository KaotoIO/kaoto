import { createContext } from 'react';

import { NewFile, StoredFile } from '../services/files/stored-file';

export interface IFilesContext {
  files: StoredFile[];
  loading: boolean;
  error: Error | undefined;
  /** Loads the files again, e.g. after the browser storage was blocked */
  reload: () => void;
  /** Adds the file to the store; the files show it once it is stored. Rejects when the path is taken */
  createFile: (file: NewFile) => Promise<StoredFile>;
  /** Writes the content to the store; the files show it once it is stored */
  updateFile: (id: string, content: string) => Promise<void>;
  /** Removes the file from the store; the files drop it once it is deleted */
  deleteFile: (id: string) => Promise<void>;
  /** Removes every file under the folder from the store; the files drop them once they are deleted */
  deleteFolder: (folderPath: string) => Promise<void>;
}

export const FilesContext = createContext<IFilesContext | undefined>(undefined);
