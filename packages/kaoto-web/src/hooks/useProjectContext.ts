import { useContext } from 'react';

import { ProjectContext } from '../context/ProjectContext';

/**
 * Returns the current ProjectContext value.
 * Must be called inside a ProjectContext.Provider (i.e. within ProjectLayout).
 */
export function useProjectContext() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProjectContext must be used within a ProjectContext.Provider');
  }
  return ctx;
}
