import { createStore } from 'zustand/vanilla';

import { EntryKind, FilesStorage } from '../../services/files/files-storage';
import { generateId } from '../../services/files/generate-id';
import { FileEntry, FilesState } from './files-ui-state';

export type FilesUiStoreApi = ReturnType<typeof createFilesUiStore>;

/** The last segment of a path: its file or folder name */
const nameOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1);

const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

/** Whether the path is the folder or lies under it */
const isInFolder = (path: string, folderPath: string) => path === folderPath || path.startsWith(`${folderPath}/`);

/** The folder paths above a path, outermost first: `a/b/c.yaml` → `a`, `a/b` */
const parentsOf = (path: string): string[] =>
  path
    .split('/')
    .slice(0, -1)
    .map((_, index, segments) => segments.slice(0, index + 1).join('/'));

const byPath = (a: FileEntry, b: FileEntry) => {
  if (a.path === b.path) return 0;
  return a.path < b.path ? -1 : 1;
};

const newEntry = (kind: EntryKind, path: string): FileEntry => ({ key: generateId(), kind, path, name: nameOf(path) });

/** The entries with folder entries for the missing parents of the paths, sorted by path */
const withParents = (entries: FileEntry[], ...paths: string[]): FileEntry[] => {
  const known = new Set(entries.map(({ path }) => path));
  const parents = paths
    .flatMap(parentsOf)
    .filter((parent) => {
      if (known.has(parent)) return false;
      known.add(parent);
      return true;
    })
    .map((parent) => newEntry('folder', parent));
  return [...entries, ...parents].sort(byPath);
};

/** The entry at another path, with its key */
const movedTo = (entry: FileEntry, path: string): FileEntry => ({ ...entry, path, name: nameOf(path) });

/** The entries with the entry of the same key replaced by the moved one */
const replaceEntry = (entries: FileEntry[], moved: FileEntry): FileEntry[] =>
  entries.map((entry) => (entry.key === moved.key ? moved : entry));

/** The entries with the folder and everything in it moved to the new path, each keeping its key */
const moveFolderEntries = (entries: FileEntry[], folderPath: string, newPath: string): FileEntry[] =>
  entries.map((entry) =>
    isInFolder(entry.path, folderPath) ? movedTo(entry, `${newPath}${entry.path.slice(folderPath.length)}`) : entry,
  );

const withoutEntry = (entries: FileEntry[], key: string): FileEntry[] => entries.filter((entry) => entry.key !== key);

const withoutFolder = (entries: FileEntry[], folderPath: string): FileEntry[] =>
  entries.filter((entry) => !isInFolder(entry.path, folderPath));

/**
 * Creates the UI store of a project's files and folders over a files storage.
 *
 * The store holds the list only, never the content. Every change goes to the storage first and reaches the list once
 * the storage confirmed it; when the storage refuses, the list stays and the promise rejects with an `Error`. The
 * operations on one entry run one after another, so that a read waits for a write still on its way. Nothing loads
 * until `load()` is called.
 */
export const createFilesUiStore = (storage: FilesStorage) => {
  /** The last operation of each entry, so that the next one waits for it */
  const pending = new Map<string, Promise<unknown>>();
  /** Counts the loads, so that an older load that ends late does not overwrite a newer one */
  let loads = 0;

  return createStore<FilesState>()((set, get) => {
    const entryOf = (key: string, kind?: EntryKind): FileEntry => {
      const entry = get().entries.find((candidate) => candidate.key === key);
      if (!entry) throw new Error(`There is no entry ${key}`);
      if (kind && entry.kind !== kind) throw new Error(`${entry.path} is not a ${kind}`);
      return entry;
    };

    /** Runs the operation once the previous one on the entry is over; rejects with an `Error` */
    const inTurn = <T>(key: string, operation: () => Promise<T>): Promise<T> => {
      const previous = pending.get(key) ?? Promise.resolve();
      const next = previous.then(operation, operation).catch((error: unknown) => {
        throw toError(error);
      });
      const settled = next.catch(() => undefined);
      pending.set(key, settled);
      void settled.then(() => {
        if (pending.get(key) === settled) pending.delete(key);
      });
      return next;
    };

    const add = async (kind: EntryKind, path: string, store: () => Promise<void>): Promise<FileEntry> => {
      try {
        await store();
      } catch (error) {
        throw toError(error);
      }
      const entry = newEntry(kind, path);
      set((state) => ({ entries: withParents([...state.entries, entry], path) }));
      return entry;
    };

    return {
      entries: [],
      status: 'loading',
      error: undefined,

      async load() {
        const load = ++loads;
        set({ status: 'loading', error: undefined });
        try {
          const listed = await storage.list();
          if (load !== loads) return;
          set({ entries: listed.map(({ kind, path }) => newEntry(kind, path)).sort(byPath), status: 'ready' });
        } catch (error) {
          if (load !== loads) return;
          set({ entries: [], status: 'error', error: toError(error) });
        }
      },

      addFile: (path, content) => add('file', path, () => storage.createFile(path, content)),

      addFolder: (path) => add('folder', path, () => storage.createFolder(path)),

      moveFile: (key, newPath) =>
        inTurn(key, async () => {
          await storage.moveFile(entryOf(key, 'file').path, newPath);
          const moved = movedTo(entryOf(key), newPath);
          set((state) => ({ entries: withParents(replaceEntry(state.entries, moved), newPath) }));
          return moved;
        }),

      removeFile: (key) =>
        inTurn(key, async () => {
          await storage.removeFile(entryOf(key, 'file').path);
          set((state) => ({ entries: withoutEntry(state.entries, key) }));
        }),

      moveFolder: (key, newPath) =>
        inTurn(key, async () => {
          const folderPath = entryOf(key, 'folder').path;
          await storage.moveFolder(folderPath, newPath);
          set((state) => ({ entries: withParents(moveFolderEntries(state.entries, folderPath, newPath), newPath) }));
        }),

      removeFolder: (key) =>
        inTurn(key, async () => {
          const folderPath = entryOf(key, 'folder').path;
          await storage.removeFolder(folderPath);
          set((state) => ({ entries: withoutFolder(state.entries, folderPath) }));
        }),

      getFileContent: (key) => inTurn(key, () => storage.readFile(entryOf(key, 'file').path)),

      setFileContent: (key, content) => inTurn(key, () => storage.writeFile(entryOf(key, 'file').path, content)),
    };
  });
};
