import { FunctionComponent, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { FilesStorage, StorageEntry } from '../services/files/files-storage';
import { indexedDbStorage } from '../services/files/indexed-db-storage';
import { FilesContext, IFilesContext, ProjectFile } from './FilesContextDefinition';

interface FilesProviderProps {
  storage?: FilesStorage;
}

/** The loaded files and folders, tagged with their load attempt, so that a reload shows the loading state */
interface LoadedFiles {
  attempt: number;
  files: ProjectFile[];
  folders: string[];
  error?: Error;
}

const NO_FILES: ProjectFile[] = [];
const NO_FOLDERS: string[] = [];

/** Whether the path is the folder or lies under it */
const isInFolder = (path: string, folderPath: string) => path === folderPath || path.startsWith(`${folderPath}/`);

/** Code unit order, the order the storage lists paths in; not `localeCompare`, which would order them differently */
const byCodeUnits = (a: string, b: string) => {
  if (a === b) return 0;
  return a < b ? -1 : 1;
};

const byPath = (a: ProjectFile, b: ProjectFile) => byCodeUnits(a.path, b.path);

const toFile = (path: string, content: string): ProjectFile => ({ id: path, path, content });

const foldersOf = (entries: StorageEntry[]): string[] =>
  entries
    .filter(({ kind }) => kind === 'folder')
    .map(({ path }) => path)
    .sort(byCodeUnits);

const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

/** Loads every file with its content and every folder */
const loadFiles = async (storage: FilesStorage): Promise<Pick<LoadedFiles, 'files' | 'folders'>> => {
  const entries = await storage.list();
  const filePaths = entries.filter(({ kind }) => kind === 'file').map(({ path }) => path);
  const files = await Promise.all(filePaths.map(async (path) => toFile(path, await storage.readFile(path))));
  files.sort(byPath);
  return { files, folders: foldersOf(entries) };
};

/** Loads the files from the storage of the project, the browser storage by default */
export const FilesProvider: FunctionComponent<PropsWithChildren<FilesProviderProps>> = ({
  storage = indexedDbStorage,
  children,
}) => {
  const [loaded, setLoaded] = useState<LoadedFiles>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    loadFiles(storage).then(
      ({ files, folders }) => {
        if (isCurrent) setLoaded({ attempt, files, folders });
      },
      (error: unknown) => {
        if (isCurrent) setLoaded({ attempt, files: NO_FILES, folders: NO_FOLDERS, error: toError(error) });
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [storage, attempt]);

  const reload = useCallback(() => {
    setAttempt((previous) => previous + 1);
  }, []);

  /** The folders as stored now, as the storage creates the missing parent folders along */
  const storedFolders = useCallback(async () => foldersOf(await storage.list()), [storage]);

  const createFile = useCallback(
    async ({ path, content }: { path: string; content: string }) => {
      await storage.createFile(path, content);
      const created = toFile(path, content);
      const folders = await storedFolders();
      setLoaded((previous) => previous && { ...previous, files: [...previous.files, created].sort(byPath), folders });
      return created;
    },
    [storage, storedFolders],
  );

  const createFolder = useCallback(
    async (folderPath: string) => {
      await storage.createFolder(folderPath);
      const folders = await storedFolders();
      setLoaded((previous) => previous && { ...previous, folders });
    },
    [storage, storedFolders],
  );

  const updateFile = useCallback(
    async (id: string, content: string) => {
      await storage.writeFile(id, content);
      setLoaded(
        (previous) =>
          previous && {
            ...previous,
            files: previous.files.map((file) => (file.id === id ? toFile(file.path, content) : file)),
          },
      );
    },
    [storage],
  );

  const renameFile = useCallback(
    async (id: string, path: string) => {
      await storage.moveFile(id, path);
      const folders = await storedFolders();
      setLoaded(
        (previous) =>
          previous && {
            ...previous,
            files: previous.files.map((file) => (file.id === id ? toFile(path, file.content) : file)).sort(byPath),
            folders,
          },
      );
    },
    [storage, storedFolders],
  );

  const renameFolder = useCallback(
    async (folderPath: string, newPath: string) => {
      await storage.moveFolder(folderPath, newPath);
      const folders = await storedFolders();
      setLoaded(
        (previous) =>
          previous && {
            ...previous,
            files: previous.files
              .map((file) =>
                isInFolder(file.path, folderPath)
                  ? toFile(`${newPath}${file.path.slice(folderPath.length)}`, file.content)
                  : file,
              )
              .sort(byPath),
            folders,
          },
      );
    },
    [storage, storedFolders],
  );

  const deleteFile = useCallback(
    async (id: string) => {
      await storage.removeFile(id);
      setLoaded((previous) => previous && { ...previous, files: previous.files.filter((file) => file.id !== id) });
    },
    [storage],
  );

  const deleteFolder = useCallback(
    async (folderPath: string) => {
      await storage.removeFolder(folderPath);
      setLoaded(
        (previous) =>
          previous && {
            ...previous,
            files: previous.files.filter((file) => !isInFolder(file.path, folderPath)),
            folders: previous.folders.filter((path) => !isInFolder(path, folderPath)),
          },
      );
    },
    [storage],
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
