import { FileEntry, FilesState } from './files-ui-state';

/** Selects the entry with the key */
export const selectEntry =
  (key: string) =>
  (state: FilesState): FileEntry | undefined =>
    state.entries.find((entry) => entry.key === key);

/** Selects the entry at the path */
export const selectEntryByPath =
  (path: string) =>
  (state: FilesState): FileEntry | undefined =>
    state.entries.find((entry) => entry.path === path);
