import { FunctionComponent, PropsWithChildren, useEffect, useMemo, useState } from 'react';

import { NewProjectFile, ProjectFile } from '../services/project-files/project-file';
import { ProjectFilesStore, projectFilesStore } from '../services/project-files/project-files.store';
import { SEED_PROJECT_FILES } from '../stubs/project-files/seed';
import { IProjectFilesContext, ProjectFilesContext } from './ProjectFilesContextDefinition';

interface ProjectFilesProviderProps {
  projectId: string;
  store?: ProjectFilesStore;
  /** Files a project without files starts with */
  seed?: NewProjectFile[];
}

/** The loaded files, tagged with their project so that a switch never shows the files of the previous one */
interface LoadedFiles {
  projectId: string;
  files: ProjectFile[];
  error?: Error;
}

const NO_FILES: ProjectFile[] = [];

const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

/** Loads the files of a project from the browser storage, seeding a project that has none yet */
export const ProjectFilesProvider: FunctionComponent<PropsWithChildren<ProjectFilesProviderProps>> = ({
  projectId,
  store = projectFilesStore,
  seed = SEED_PROJECT_FILES,
  children,
}) => {
  const [loaded, setLoaded] = useState<LoadedFiles>();

  useEffect(() => {
    let isCurrent = true;
    store.seedIfEmpty(projectId, seed).then(
      (files) => {
        if (isCurrent) setLoaded({ projectId, files });
      },
      (error: unknown) => {
        if (isCurrent) setLoaded({ projectId, files: NO_FILES, error: toError(error) });
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [projectId, store, seed]);

  const current = loaded?.projectId === projectId ? loaded : undefined;
  const value = useMemo<IProjectFilesContext>(
    () => ({ files: current?.files ?? NO_FILES, loading: !current, error: current?.error }),
    [current],
  );

  return <ProjectFilesContext.Provider value={value}>{children}</ProjectFilesContext.Provider>;
};
