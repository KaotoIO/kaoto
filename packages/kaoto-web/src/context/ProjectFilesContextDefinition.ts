import { createContext } from 'react';

import { ProjectFile } from '../services/project-files/project-file';

export interface IProjectFilesContext {
  files: ProjectFile[];
  loading: boolean;
  error: Error | undefined;
  /** Loads the files again, e.g. after the browser storage was blocked */
  reload: () => void;
}

export const ProjectFilesContext = createContext<IProjectFilesContext | undefined>(undefined);
