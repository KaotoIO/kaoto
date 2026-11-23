import 'fake-indexeddb/auto';

import { IDBFactory } from 'fake-indexeddb';

import { indexedDbStorage } from '../services/files/indexed-db-storage';

/**
 * Gives the test a fresh, empty in-memory IndexedDB.
 *
 * The tests run with `isolate: false`, so the global factory would otherwise keep the databases of earlier tests,
 * and the shared storage would keep its connection to them.
 */
export const resetTestIndexedDB = (): void => {
  indexedDbStorage.close();
  globalThis.indexedDB = new IDBFactory();
};
