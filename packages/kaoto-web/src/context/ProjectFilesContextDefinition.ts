import { createContext } from 'react';

import { ProjectFile } from '../services/project-files/project-file';

export interface IProjectFilesContext {
  files: ProjectFile[];
  loading: boolean;
  error: Error | undefined;
}

export const ProjectFilesContext = createContext<IProjectFilesContext | undefined>(undefined);
