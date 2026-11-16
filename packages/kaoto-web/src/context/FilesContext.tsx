import { FunctionComponent, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { FilesStore, filesStore } from '../services/files/files.store';
import { StoredFile } from '../services/files/stored-file';
import { FilesContext, IFilesContext } from './FilesContextDefinition';

interface FilesProviderProps {
  store?: FilesStore;
}

/** The loaded files, tagged with their load attempt, so that a reload shows the loading state */
interface LoadedFiles {
  attempt: number;
  files: StoredFile[];
  error?: Error;
}

const NO_FILES: StoredFile[] = [];

const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

/** Loads the files from the browser storage */
export const FilesProvider: FunctionComponent<PropsWithChildren<FilesProviderProps>> = ({
  store = filesStore,
  children,
}) => {
  const [loaded, setLoaded] = useState<LoadedFiles>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    store.getFiles().then(
      (files) => {
        if (isCurrent) setLoaded({ attempt, files });
      },
      (error: unknown) => {
        if (isCurrent) setLoaded({ attempt, files: NO_FILES, error: toError(error) });
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [store, attempt]);

  const reload = useCallback(() => {
    setAttempt((previous) => previous + 1);
  }, []);

  const updateFile = useCallback(
    async (id: string, content: string) => {
      const updated = await store.updateFile(id, content);
      setLoaded(
        (previous) =>
          previous && {
            ...previous,
            files: previous.files.map((file) => (file.id === updated.id ? updated : file)),
          },
      );
    },
    [store],
  );

  const current = loaded?.attempt === attempt ? loaded : undefined;
  const value = useMemo<IFilesContext>(
    () => ({ files: current?.files ?? NO_FILES, loading: !current, error: current?.error, reload, updateFile }),
    [current, reload, updateFile],
  );

  return <FilesContext.Provider value={value}>{children}</FilesContext.Provider>;
};
