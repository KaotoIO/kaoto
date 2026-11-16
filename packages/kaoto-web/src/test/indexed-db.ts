import 'fake-indexeddb/auto';

import { IDBFactory } from 'fake-indexeddb';

import { filesStore } from '../services/files/files.store';

/**
 * Gives the test a fresh, empty in-memory IndexedDB.
 *
 * The tests run with `isolate: false`, so the global factory would otherwise keep the databases of earlier tests,
 * and the shared store would keep its connection to them.
 */
export const resetTestIndexedDB = (): void => {
  filesStore.close();
  globalThis.indexedDB = new IDBFactory();
};
