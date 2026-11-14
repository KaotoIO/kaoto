import 'fake-indexeddb/auto';

import { IDBFactory } from 'fake-indexeddb';

/**
 * Gives the test a fresh, empty in-memory IndexedDB.
 *
 * The tests run with `isolate: false`, so the global factory would otherwise keep the databases of earlier tests.
 */
export const resetTestIndexedDB = (): void => {
  globalThis.indexedDB = new IDBFactory();
};
