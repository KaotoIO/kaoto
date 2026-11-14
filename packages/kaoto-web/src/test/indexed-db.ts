import 'fake-indexeddb/auto';

import { IDBFactory } from 'fake-indexeddb';

import { projectFilesStore } from '../services/project-files/project-files.store';

/**
 * Gives the test a fresh, empty in-memory IndexedDB.
 *
 * The tests run with `isolate: false`, so the global factory would otherwise keep the databases of earlier tests,
 * and the shared store would keep its connection to them.
 */
export const resetTestIndexedDB = (): void => {
  projectFilesStore.close();
  globalThis.indexedDB = new IDBFactory();
};
