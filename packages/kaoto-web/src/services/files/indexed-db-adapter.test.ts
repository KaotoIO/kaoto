import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { describeFilesAdapter } from '../../test/files-adapter-contract';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { FilesStore } from './files.store';
import { IndexedDbAdapter } from './indexed-db-adapter';

let store: FilesStore | undefined;

beforeEach(() => {
  resetTestIndexedDB();
});

afterEach(() => {
  store?.close();
});

describe('IndexedDbAdapter', () => {
  describeFilesAdapter('IndexedDbAdapter', () => {
    store = new FilesStore();
    return new IndexedDbAdapter(store);
  });

  it('keeps the files and folders in the browser storage for the next visit', async () => {
    const firstVisit = new FilesStore();
    await new IndexedDbAdapter(firstVisit).createFile('routes/a.camel.yaml', 'content');
    firstVisit.close();

    store = new FilesStore();
    const nextVisit = new IndexedDbAdapter(store);

    expect(await nextVisit.list()).toEqual([
      { kind: 'folder', path: 'routes' },
      { kind: 'file', path: 'routes/a.camel.yaml' },
    ]);
    expect(await nextVisit.readFile('routes/a.camel.yaml')).toBe('content');
  });
});
