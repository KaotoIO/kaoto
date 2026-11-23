import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { describeFilesStorage } from '../../test/files-storage-contract';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { FilesStore } from './files.store';
import { IndexedDbStorage } from './indexed-db-storage';

let store: FilesStore | undefined;

beforeEach(() => {
  resetTestIndexedDB();
});

afterEach(() => {
  store?.close();
});

describe('IndexedDbStorage', () => {
  describeFilesStorage('IndexedDbStorage', () => {
    store = new FilesStore();
    return new IndexedDbStorage(store);
  });

  it('keeps the files and folders in the browser storage for the next visit', async () => {
    const firstVisit = new FilesStore();
    await new IndexedDbStorage(firstVisit).createFile('routes/a.camel.yaml', 'content');
    firstVisit.close();

    store = new FilesStore();
    const nextVisit = new IndexedDbStorage(store);

    expect(await nextVisit.list()).toEqual([
      { kind: 'folder', path: 'routes' },
      { kind: 'file', path: 'routes/a.camel.yaml' },
    ]);
    expect(await nextVisit.readFile('routes/a.camel.yaml')).toBe('content');
  });
});
