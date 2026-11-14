import { ReactElement } from 'react';

import { ProjectFilesProvider } from '../context/ProjectFilesContext';

/**
 * Wraps the element in a ProjectFilesProvider backed by the shared store and the default seed.
 *
 * Use it inside the router, and call `resetTestIndexedDB()` in `beforeEach` so that every test starts empty.
 */
export const withProjectFiles = (ui: ReactElement, projectId = 'my-project'): ReactElement => (
  <ProjectFilesProvider projectId={projectId}>{ui}</ProjectFilesProvider>
);
