import { projectFilesStore } from '../services/project-files/project-files.store';
import { resetTestIndexedDB } from './indexed-db';

describe('resetTestIndexedDB', () => {
  it('gives the shared store an empty database', async () => {
    resetTestIndexedDB();
    await projectFilesStore.createFile('p1', { id: 'left-over', path: 'a.yaml', type: 'integration', content: '' });

    resetTestIndexedDB();

    expect(await projectFilesStore.getFiles('p1')).toEqual([]);
  });
});
