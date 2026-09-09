import { createContext } from 'react';

export interface IProjectContext {
  projectId: string;
}

export const ProjectContext = createContext<IProjectContext | undefined>(undefined);
