import { indexedDbStorage } from '../services/files/indexed-db-storage';
import { resetTestIndexedDB } from './indexed-db';

describe('resetTestIndexedDB', () => {
  it('gives the shared storage an empty database', async () => {
    resetTestIndexedDB();
    await indexedDbStorage.createFile('a.yaml', '');

    resetTestIndexedDB();

    expect(await indexedDbStorage.list()).toEqual([]);
  });
});
