import { useContext } from 'react';

import { IProjectFilesContext, ProjectFilesContext } from '../context/ProjectFilesContextDefinition';

/**
 * Returns the files of the current project.
 * Must be called inside a ProjectFilesProvider (i.e. within ProjectLayout).
 */
export function useProjectFiles(): IProjectFilesContext {
  const ctx = useContext(ProjectFilesContext);
  if (!ctx) {
    throw new Error('useProjectFiles must be used within a ProjectFilesProvider');
  }
  return ctx;
}
