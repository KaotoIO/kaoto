import { randomUUID } from 'node:crypto';

import { openDB } from 'idb';

import { resetTestIndexedDB } from '../../test/indexed-db';
import { NewProjectFile } from './project-file';
import { ProjectFilesStore } from './project-files.store';

describe('ProjectFilesStore', () => {
  let store: ProjectFilesStore;

  beforeEach(() => {
    resetTestIndexedDB();
    // jsdom does not provide crypto.randomUUID
    vi.stubGlobal('crypto', { randomUUID });
    store = new ProjectFilesStore();
  });

  afterEach(() => {
    store.close();
  });

  it('returns no files for an unknown project', async () => {
    expect(await store.getFiles('p1')).toEqual([]);
  });

  it('creates a file with a generated id and returns it from getFiles', async () => {
    const file = await store.createFile('p1', { path: 'a.camel.yaml', type: 'integration', content: 'x' });

    expect(file.id).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(file).toMatchObject({ projectId: 'p1', path: 'a.camel.yaml', type: 'integration', content: 'x' });
    expect(await store.getFiles('p1')).toEqual([file]);
  });

  it('keeps a given id', async () => {
    const file = await store.createFile('p1', { id: 'main-flow', path: 'a.yaml', type: 'integration', content: '' });

    expect(file.id).toBe('main-flow');
  });

  it('rejects a second file with the same path in the same project', async () => {
    await store.createFile('p1', { path: 'a.yaml', type: 'integration', content: '' });

    await expect(store.createFile('p1', { path: 'a.yaml', type: 'integration', content: '' })).rejects.toThrow();
    expect(await store.getFiles('p1')).toHaveLength(1);
  });

  it('allows the same id and path in different projects', async () => {
    await store.createFile('p1', { id: 'f', path: 'a.yaml', type: 'integration', content: '1' });
    await store.createFile('p2', { id: 'f', path: 'a.yaml', type: 'integration', content: '2' });

    expect((await store.getFiles('p1')).map((file) => file.content)).toEqual(['1']);
    expect((await store.getFiles('p2')).map((file) => file.content)).toEqual(['2']);
  });

  it('returns the files sorted by path', async () => {
    await store.createFile('p1', { path: 'b.yaml', type: 'integration', content: '' });
    await store.createFile('p1', { path: 'a/c.yaml', type: 'integration', content: '' });
    await store.createFile('p1', { path: 'a.yaml', type: 'integration', content: '' });

    expect((await store.getFiles('p1')).map((file) => file.path)).toEqual(['a.yaml', 'a/c.yaml', 'b.yaml']);
  });

  it('updates the content and the timestamp', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const file = await store.createFile('p1', { path: 'a.yaml', type: 'integration', content: 'old' });
    now.mockReturnValue(2000);

    const updated = await store.updateFile('p1', file.id, 'new');

    expect(file.updatedAt).toBe(1000);
    expect(updated).toMatchObject({ content: 'new', updatedAt: 2000 });
    expect(await store.getFiles('p1')).toEqual([updated]);
  });

  it('rejects updating a missing file', async () => {
    await expect(store.updateFile('p1', 'missing', 'x')).rejects.toThrow();
    expect(await store.getFiles('p1')).toEqual([]);
  });

  it('deletes a file', async () => {
    const file = await store.createFile('p1', { path: 'a.yaml', type: 'integration', content: '' });

    await store.deleteFile('p1', file.id);

    expect(await store.getFiles('p1')).toEqual([]);
  });

  it('seeds an empty project', async () => {
    const files = await store.seedIfEmpty('p1', [{ id: 'a', path: 'a.yaml', type: 'integration', content: 'A' }]);

    expect(files).toEqual([expect.objectContaining({ projectId: 'p1', id: 'a', path: 'a.yaml', content: 'A' })]);
    expect(await store.getFiles('p1')).toEqual(files);
  });

  it('does not seed a project that already has files', async () => {
    await store.createFile('p1', { id: 'own', path: 'own.yaml', type: 'integration', content: '' });

    const files = await store.seedIfEmpty('p1', [{ id: 'a', path: 'a.yaml', type: 'integration', content: '' }]);

    expect(files.map((file) => file.id)).toEqual(['own']);
  });

  it('seeds only once when two tabs open the same new project at the same time', async () => {
    const otherTab = new ProjectFilesStore();
    const seed: NewProjectFile[] = [{ id: 'a', path: 'a.yaml', type: 'integration', content: '' }];

    await Promise.all([store.seedIfEmpty('p1', seed), otherTab.seedIfEmpty('p1', seed)]);

    expect(await store.getFiles('p1')).toHaveLength(1);
    otherTab.close();
  });

  it('rejects without leaving an unhandled rejection when a seed file cannot be added', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      const seed: NewProjectFile[] = [
        { id: 'a', path: 'same.yaml', type: 'integration', content: '' },
        { id: 'b', path: 'same.yaml', type: 'integration', content: '' },
      ];

      await expect(store.seedIfEmpty('p1', seed)).rejects.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(unhandled).not.toHaveBeenCalled();
      expect(await store.getFiles('p1')).toEqual([]);
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('lets a newer version of the database open while this store is connected', async () => {
    await store.getFiles('p1');

    const upgraded = openDB('kaoto-projects', 2);
    const timeout = new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve('blocked');
      }, 1000);
    });

    const result = await Promise.race([upgraded.then(() => 'opened'), timeout]);
    expect(result).toBe('opened');
    (await upgraded).close();
  });

  it('fails instead of hanging after a newer version took over the database', async () => {
    await store.getFiles('p1');
    (await openDB('kaoto-projects', 2)).close();

    await expect(store.getFiles('p1')).rejects.toThrow();
  });

  it('rejects when IndexedDB is unavailable', async () => {
    // @ts-expect-error simulating a browser without IndexedDB
    globalThis.indexedDB = undefined;
    const unavailable = new ProjectFilesStore();

    await expect(unavailable.getFiles('p1')).rejects.toThrow();
  });

  it('opens the database again after a failed attempt', async () => {
    // @ts-expect-error simulating a browser where IndexedDB is not available yet
    globalThis.indexedDB = undefined;
    const retrying = new ProjectFilesStore();
    await expect(retrying.getFiles('p1')).rejects.toThrow();

    resetTestIndexedDB();

    expect(await retrying.getFiles('p1')).toEqual([]);
    retrying.close();
  });
});
