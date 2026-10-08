import { mountStoreDevtool } from 'simple-zustand-devtools';

import { useDocumentTreeStore } from './document-tree.store';
import { useSchemasStore } from './schemas.store';
import { useSourceCodeStore } from './sourcecode.store';

/**
 * Mounts the Zustand devtools for every store, only in development mode.
 * Reads the environment on every call; `mount` is exposed so tests don't mount real devtools.
 */
export const mountStoresDevtools = (mount: typeof mountStoreDevtool = mountStoreDevtool): void => {
  const isDevMode = import.meta.env?.DEV === true && import.meta.env.MODE !== 'test';

  if (isDevMode) {
    mount('Schemas Store', useSchemasStore);
    mount('SourceCode Store', useSourceCodeStore);
    mount('Document Tree Store', useDocumentTreeStore);
  }
};

mountStoresDevtools();

export * from './document-tree.store';
export * from './schemas.store';
export * from './sourcecode.store';
