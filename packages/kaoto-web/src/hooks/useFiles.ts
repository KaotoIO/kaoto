import { useContext } from 'react';

import { FilesContext, IFilesContext } from '../context/FilesContextDefinition';

/**
 * Returns the stored files.
 * Must be called inside a FilesProvider (i.e. within ProjectLayout).
 */
export function useFiles(): IFilesContext {
  const ctx = useContext(FilesContext);
  if (!ctx) {
    throw new Error('useFiles must be used within a FilesProvider');
  }
  return ctx;
}
