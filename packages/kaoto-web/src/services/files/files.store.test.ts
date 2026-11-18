import { randomUUID } from 'node:crypto';

import { openDB } from 'idb';

import { resetTestIndexedDB } from '../../test/indexed-db';
import { FilesStore } from './files.store';

describe('FilesStore', () => {
  let store: FilesStore;

  beforeEach(() => {
    resetTestIndexedDB();
    // jsdom does not provide crypto.randomUUID
    vi.stubGlobal('crypto', { randomUUID });
    store = new FilesStore();
  });

  afterEach(() => {
    store.close();
    vi.unstubAllGlobals();
  });

  it('starts without files', async () => {
    expect(await store.getFiles()).toEqual([]);
  });

  it('creates a file with a generated UUID and returns it from getFiles', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const file = await store.createFile({ path: 'a.camel.yaml', content: 'x' });
    now.mockRestore();

    expect(file.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(file).toEqual({ id: file.id, path: 'a.camel.yaml', content: 'x', updatedAt: 1000 });
    expect(await store.getFiles()).toEqual([file]);
  });

  it('keeps a given id', async () => {
    const file = await store.createFile({ id: 'main-flow', path: 'a.yaml', content: '' });

    expect(file.id).toBe('main-flow');
  });

  it('rejects a second file with the same path', async () => {
    await store.createFile({ path: 'a.yaml', content: '' });

    await expect(store.createFile({ path: 'a.yaml', content: '' })).rejects.toThrow();
    expect(await store.getFiles()).toHaveLength(1);
  });

  it('returns the files sorted by path', async () => {
    await store.createFile({ path: 'b.yaml', content: '' });
    await store.createFile({ path: 'a/c.yaml', content: '' });
    await store.createFile({ path: 'a.yaml', content: '' });

    expect((await store.getFiles()).map((file) => file.path)).toEqual(['a.yaml', 'a/c.yaml', 'b.yaml']);
  });

  it('updates the content and the timestamp', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const file = await store.createFile({ path: 'a.yaml', content: 'old' });
    now.mockReturnValue(2000);

    const updated = await store.updateFile(file.id, 'new');

    expect(file.updatedAt).toBe(1000);
    expect(updated).toEqual({ ...file, content: 'new', updatedAt: 2000 });
    expect(await store.getFiles()).toEqual([updated]);
  });

  it('rejects updating a missing file without leaving an unhandled rejection', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      await expect(store.updateFile('missing', 'x')).rejects.toThrow('The file missing does not exist');
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(unhandled).not.toHaveBeenCalled();
      expect(await store.getFiles()).toEqual([]);
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('renames a file, keeps its id and content and moves its update time', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const file = await store.createFile({ path: 'a.yaml', content: 'x' });
    now.mockReturnValue(2000);

    const renamed = await store.renameFile(file.id, 'routes/b.yaml');
    now.mockRestore();

    // updatedAt tracks the stored entry, and the path is part of it
    expect(renamed).toEqual({ ...file, path: 'routes/b.yaml', updatedAt: 2000 });
    expect(await store.getFiles()).toEqual([renamed]);
  });

  it('rejects renaming to the path of another file and keeps both files', async () => {
    const a = await store.createFile({ path: 'a.yaml', content: '' });
    const b = await store.createFile({ path: 'b.yaml', content: '' });

    await expect(store.renameFile(a.id, 'b.yaml')).rejects.toThrow();
    expect(await store.getFiles()).toEqual([a, b]);
  });

  it('rejects renaming a missing file', async () => {
    await expect(store.renameFile('missing', 'a.yaml')).rejects.toThrow('The file missing does not exist');
  });

  it('deletes a file', async () => {
    const file = await store.createFile({ path: 'a.yaml', content: '' });

    await store.deleteFile(file.id);

    expect(await store.getFiles()).toEqual([]);
  });

  it('deletes the files of a folder and its subfolders and returns their ids', async () => {
    const paths = ['a.yaml', 'a/b.yaml', 'a/c/d.yaml', 'a-b/e.yaml', 'a.b/f.yaml', 'ab/g.yaml', 'x/a/h.yaml'];
    const files = await Promise.all(paths.map((path) => store.createFile({ path, content: '' })));
    const idOf = (path: string) => files.find((file) => file.path === path)!.id;

    const deleted = await store.deleteFolder('a');

    expect(deleted.sort()).toEqual([idOf('a/b.yaml'), idOf('a/c/d.yaml')].sort());
    expect((await store.getFiles()).map((file) => file.path)).toEqual([
      'a-b/e.yaml',
      'a.b/f.yaml',
      'a.yaml',
      'ab/g.yaml',
      'x/a/h.yaml',
    ]);
  });

  it('deletes the files of a nested folder only', async () => {
    await store.createFile({ path: 'a/b.yaml', content: '' });
    await store.createFile({ path: 'a/c/d.yaml', content: '' });

    await store.deleteFolder('a/c');

    expect((await store.getFiles()).map((file) => file.path)).toEqual(['a/b.yaml']);
  });

  it('deletes nothing for a folder without files', async () => {
    await store.createFile({ path: 'a.yaml', content: '' });

    expect(await store.deleteFolder('a')).toEqual([]);
    expect(await store.getFiles()).toHaveLength(1);
  });

  it('lets a newer version of the database open while this store is connected', async () => {
    await store.getFiles();

    const upgraded = openDB('kaoto', 2);
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
    await store.getFiles();
    (await openDB('kaoto', 2)).close();

    await expect(store.getFiles()).rejects.toThrow();
  });

  it('rejects when IndexedDB is unavailable', async () => {
    // @ts-expect-error simulating a browser without IndexedDB
    globalThis.indexedDB = undefined;
    const unavailable = new FilesStore();

    await expect(unavailable.getFiles()).rejects.toThrow();
  });

  it('opens the database again after a failed attempt', async () => {
    // @ts-expect-error simulating a browser where IndexedDB is not available yet
    globalThis.indexedDB = undefined;
    const retrying = new FilesStore();
    await expect(retrying.getFiles()).rejects.toThrow();

    resetTestIndexedDB();

    expect(await retrying.getFiles()).toEqual([]);
    retrying.close();
  });
});
