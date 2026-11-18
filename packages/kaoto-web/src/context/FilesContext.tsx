import { FunctionComponent, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { FilesStore, filesStore } from '../services/files/files.store';
import { NewFile, StoredFile } from '../services/files/stored-file';
import { FilesContext, IFilesContext } from './FilesContextDefinition';

interface FilesProviderProps {
  store?: FilesStore;
}

/** The loaded files and folders, tagged with their load attempt, so that a reload shows the loading state */
interface LoadedFiles {
  attempt: number;
  files: StoredFile[];
  folders: string[];
  error?: Error;
}

const NO_FILES: StoredFile[] = [];
const NO_FOLDERS: string[] = [];

/** Whether the path is the folder or lies under it */
const isInFolder = (path: string, folderPath: string) => path === folderPath || path.startsWith(`${folderPath}/`);

const byPath = (a: StoredFile, b: StoredFile) => {
  if (a.path === b.path) return 0;
  return a.path < b.path ? -1 : 1;
};

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
    Promise.all([store.getFiles(), store.getFolders()]).then(
      ([files, folders]) => {
        if (isCurrent) setLoaded({ attempt, files, folders });
      },
      (error: unknown) => {
        if (isCurrent) setLoaded({ attempt, files: NO_FILES, folders: NO_FOLDERS, error: toError(error) });
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [store, attempt]);

  const reload = useCallback(() => {
    setAttempt((previous) => previous + 1);
  }, []);

  const createFile = useCallback(
    async (file: NewFile) => {
      const created = await store.createFile(file);
      // The store creates the missing parent folders as well
      const folders = await store.getFolders();
      setLoaded((previous) => previous && { ...previous, files: [...previous.files, created].sort(byPath), folders });
      return created;
    },
    [store],
  );

  const createFolder = useCallback(
    async (folderPath: string) => {
      await store.createFolder(folderPath);
      // The store creates the missing parent folders as well
      const folders = await store.getFolders();
      setLoaded((previous) => previous && { ...previous, folders });
    },
    [store],
  );

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

  const renameFile = useCallback(
    async (id: string, path: string) => {
      const renamed = await store.renameFile(id, path);
      // The store creates the missing parent folders of the new path as well
      const folders = await store.getFolders();
      setLoaded(
        (previous) =>
          previous && {
            ...previous,
            files: previous.files.map((file) => (file.id === renamed.id ? renamed : file)).sort(byPath),
            folders,
          },
      );
    },
    [store],
  );

  const renameFolder = useCallback(
    async (folderPath: string, newPath: string) => {
      const moved = new Map((await store.renameFolder(folderPath, newPath)).map((file) => [file.id, file]));
      const folders = await store.getFolders();
      setLoaded(
        (previous) =>
          previous && {
            ...previous,
            files: previous.files.map((file) => moved.get(file.id) ?? file).sort(byPath),
            folders,
          },
      );
    },
    [store],
  );

  const deleteFile = useCallback(
    async (id: string) => {
      await store.deleteFile(id);
      setLoaded((previous) => previous && { ...previous, files: previous.files.filter((file) => file.id !== id) });
    },
    [store],
  );

  const deleteFolder = useCallback(
    async (folderPath: string) => {
      const deleted = new Set(await store.deleteFolder(folderPath));
      setLoaded(
        (previous) =>
          previous && {
            ...previous,
            files: previous.files.filter((file) => !deleted.has(file.id)),
            folders: previous.folders.filter((path) => !isInFolder(path, folderPath)),
          },
      );
    },
    [store],
  );

  const current = loaded?.attempt === attempt ? loaded : undefined;
  const value = useMemo<IFilesContext>(
    () => ({
      files: current?.files ?? NO_FILES,
      folders: current?.folders ?? NO_FOLDERS,
      loading: !current,
      error: current?.error,
      reload,
      createFile,
      createFolder,
      updateFile,
      renameFile,
      renameFolder,
      deleteFile,
      deleteFolder,
    }),
    [current, reload, createFile, createFolder, updateFile, renameFile, renameFolder, deleteFile, deleteFolder],
  );

  return <FilesContext.Provider value={value}>{children}</FilesContext.Provider>;
};
