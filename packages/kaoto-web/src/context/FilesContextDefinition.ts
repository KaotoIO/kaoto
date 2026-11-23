import { createContext } from 'react';

/**
 * A file of the project with its content.
 *
 * Its id is its path, as the storage names files by their paths; the file route and the Explorer tree use it. Moving
 * a file gives it a new id.
 */
export interface ProjectFile {
  id: string;
  path: string;
  content: string;
}

export interface IFilesContext {
  /** Sorted by path */
  files: ProjectFile[];
  /** Every folder, sorted by path, including the ones that hold no file */
  folders: string[];
  loading: boolean;
  error: Error | undefined;
  /** Loads the files again, e.g. after the browser storage was blocked */
  reload: () => void;
  /** Adds the file to the storage; the files show it once it is stored. Rejects when the path is taken */
  createFile: (file: { path: string; content: string }) => Promise<ProjectFile>;
  /** Keeps the folder in the storage; the folders show it once it is stored. Rejects when it was created before */
  createFolder: (folderPath: string) => Promise<void>;
  /** Writes the content to the storage; the files show it once it is stored */
  updateFile: (id: string, content: string) => Promise<void>;
  /** Moves the file to the path; the files show it once it is stored. Rejects when the path is taken */
  renameFile: (id: string, path: string) => Promise<void>;
  /**
   * Moves the folder with everything under it. The files and folders show the new paths once they are stored. Rejects
   * when the new path is taken
   */
  renameFolder: (folderPath: string, newPath: string) => Promise<void>;
  /** Removes the file from the storage; the files drop it once it is deleted */
  deleteFile: (id: string) => Promise<void>;
  /** Removes the folder and every file and folder under it from the storage; they are dropped once deleted */
  deleteFolder: (folderPath: string) => Promise<void>;
}

export const FilesContext = createContext<IFilesContext | undefined>(undefined);
