import { FunctionComponent, PropsWithChildren, useEffect, useState } from 'react';

import { FilesStorage } from '../../services/files/files-storage';
import { createFilesUiStore } from './files-ui-store';
import { FilesUiStoreContext } from './files-ui-store-context';

interface FilesUiStoreProviderProps {
  /** Where the project's files are kept; another storage, e.g. of another project, gets a store of its own */
  storage: FilesStorage;
}

/** Provides the files UI store of a project and loads its files once it is mounted */
export const FilesUiStoreProvider: FunctionComponent<PropsWithChildren<FilesUiStoreProviderProps>> = ({
  storage,
  children,
}) => {
  const [current, setCurrent] = useState(() => ({ storage, store: createFilesUiStore(storage) }));
  let { store } = current;
  if (current.storage !== storage) {
    // Adjust state while rendering (https://react.dev/learn/you-might-not-need-an-effect)
    store = createFilesUiStore(storage);
    setCurrent({ storage, store });
  }

  useEffect(() => {
    // StrictMode runs this twice on mount; the second load supersedes the first, before anything used its keys
    void store.getState().load();
  }, [store]);

  return <FilesUiStoreContext.Provider value={store}>{children}</FilesUiStoreContext.Provider>;
};
