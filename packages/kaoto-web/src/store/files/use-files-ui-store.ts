import { useContext } from 'react';
import { useStore } from 'zustand';

import { FilesState } from './files-ui-state';
import { FilesUiStoreApi } from './files-ui-store';
import { FilesUiStoreContext } from './files-ui-store-context';

/**
 * The files UI store of the open project, for calling its actions in handlers.
 * Must be called inside a FilesUiStoreProvider.
 */
export const useFilesUiStoreApi = (): FilesUiStoreApi => {
  const store = useContext(FilesUiStoreContext);
  if (!store) throw new Error('useFilesUiStore must be used within a FilesUiStoreProvider');
  return store;
};

/**
 * Selects from the files UI store of the open project; the component renders again when the selected value changes.
 * Wrap a selector that builds a new array or object in `useShallow`.
 */
export const useFilesUiStore = <T>(selector: (state: FilesState) => T): T => useStore(useFilesUiStoreApi(), selector);
