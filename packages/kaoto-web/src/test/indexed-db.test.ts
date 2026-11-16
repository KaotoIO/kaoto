import { filesStore } from '../services/files/files.store';
import { resetTestIndexedDB } from './indexed-db';

describe('resetTestIndexedDB', () => {
  it('gives the shared store an empty database', async () => {
    resetTestIndexedDB();
    await filesStore.createFile({ id: 'left-over', path: 'a.yaml', content: '' });

    resetTestIndexedDB();

    expect(await filesStore.getFiles()).toEqual([]);
  });
});
