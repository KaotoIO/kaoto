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
    expect(file).toEqual({ id: file.id, path: 'a.camel.yaml', content: 'x', createdAt: 1000, updatedAt: 1000 });
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

  describe('folders', () => {
    it('starts without folders', async () => {
      expect(await store.getFolders()).toEqual([]);
    });

    it('creates folders with their parents and returns them sorted by path', async () => {
      await store.createFolder('b');
      await store.createFolder('a/c');

      expect(await store.getFolders()).toEqual(['a', 'a/c', 'b']);
    });

    it('creates the missing parent folders of a file', async () => {
      await store.createFile({ path: 'a/b/c.yaml', content: '' });

      expect(await store.getFolders()).toEqual(['a', 'a/b']);
    });

    it('creates the missing parent folders of a renamed file', async () => {
      const file = await store.createFile({ path: 'a.yaml', content: '' });

      await store.renameFile(file.id, 'x/y/a.yaml');

      expect(await store.getFolders()).toEqual(['x', 'x/y']);
    });

    it('keeps a folder after its last file is deleted', async () => {
      const file = await store.createFile({ path: 'a/b.yaml', content: '' });

      await store.deleteFile(file.id);

      expect(await store.getFolders()).toEqual(['a']);
    });

    it('keeps a folder after its last file is renamed out of it', async () => {
      const file = await store.createFile({ path: 'a/b.yaml', content: '' });

      await store.renameFile(file.id, 'b.yaml');

      expect(await store.getFolders()).toEqual(['a']);
    });

    it('rejects a second folder with the same path', async () => {
      await store.createFolder('a');

      await expect(store.createFolder('a')).rejects.toThrow();
      expect(await store.getFolders()).toEqual(['a']);
    });

    it.each([
      ['a folder at the path of a file', async (s: FilesStore) => s.createFolder('a.yaml')],
      ['a file at the path of a folder', async (s: FilesStore) => s.createFile({ path: 'f', content: '' })],
      ['a file under a file', async (s: FilesStore) => s.createFile({ path: 'a.yaml/b.yaml', content: '' })],
      ['a folder under a file', async (s: FilesStore) => s.createFolder('a.yaml/b')],
    ])('rejects %s and writes nothing', async (_, create) => {
      await store.createFile({ path: 'a.yaml', content: '' });
      await store.createFolder('f');

      await expect(create(store)).rejects.toThrow();
      expect((await store.getFiles()).map(({ path }) => path)).toEqual(['a.yaml']);
      expect(await store.getFolders()).toEqual(['f']);
    });

    it('rejects renaming a file to the path of a folder', async () => {
      const file = await store.createFile({ path: 'a.yaml', content: '' });
      await store.createFolder('f');

      await expect(store.renameFile(file.id, 'f')).rejects.toThrow();
      expect((await store.getFiles()).map(({ path }) => path)).toEqual(['a.yaml']);
    });

    it('deletes a folder with its subfolders and files and nothing outside it', async () => {
      for (const path of ['a', 'a/b', 'a-b', 'ab', 'x/a']) await store.createFolder(path);
      const inside = await store.createFile({ path: 'a/c/d.yaml', content: '' });
      await store.createFile({ path: 'a.b/f.yaml', content: '' });

      expect(await store.deleteFolder('a')).toEqual([inside.id]);
      expect(await store.getFolders()).toEqual(['a-b', 'a.b', 'ab', 'x', 'x/a']);
      expect((await store.getFiles()).map(({ path }) => path)).toEqual(['a.b/f.yaml']);
    });
  });

  describe('renaming folders', () => {
    it('moves the folder with its subfolders and files and keeps their ids', async () => {
      await store.createFolder('a/empty');
      const file = await store.createFile({ path: 'a/c/d.yaml', content: 'x' });
      await store.createFile({ path: 'a-b/e.yaml', content: '' });
      await store.createFolder('ab');

      const renamed = await store.renameFolder('a', 'z');

      // The timestamps are checked in their own test
      expect(renamed).toEqual([{ ...file, path: 'z/c/d.yaml', updatedAt: expect.any(Number) }]);
      expect(await store.getFolders()).toEqual(['a-b', 'ab', 'z', 'z/c', 'z/empty']);
      expect((await store.getFiles()).map(({ id, path }) => [id, path])).toEqual([
        [expect.any(String), 'a-b/e.yaml'],
        [file.id, 'z/c/d.yaml'],
      ]);
    });

    it('moves a nested folder and creates the missing parents of its new path', async () => {
      await store.createFolder('a/b');

      await store.renameFolder('a/b', 'x/y');

      expect(await store.getFolders()).toEqual(['a', 'x', 'x/y']);
    });

    it.each([
      ['a taken folder path', 'f'],
      ['a taken file path', 'g.yaml'],
      ['a path under a file', 'g.yaml/a'],
      ['a path inside the folder itself', 'a/inner'],
    ])('rejects %s and writes nothing', async (_, newPath) => {
      await store.createFolder('a');
      await store.createFolder('f');
      await store.createFile({ path: 'g.yaml', content: '' });

      await expect(store.renameFolder('a', newPath)).rejects.toThrow();
      expect(await store.getFolders()).toEqual(['a', 'f']);
    });

    it('rejects renaming a missing folder', async () => {
      await expect(store.renameFolder('missing', 'other')).rejects.toThrow();
    });

    it('moves the update time of the folder and of every entry it holds, as their paths change', async () => {
      const at = (time: number) => vi.spyOn(Date, 'now').mockReturnValue(time);
      at(1000);
      await store.createFolder('a/sub');
      await store.createFile({ path: 'a/b.yaml', content: '' });
      await store.createFolder('outside');
      at(2000);

      const [renamed] = await store.renameFolder('a', 'z');
      vi.restoreAllMocks();

      expect(renamed).toMatchObject({ path: 'z/b.yaml', createdAt: 1000, updatedAt: 2000 });
      const { id } = (await store.getProjects())[0];
      store.close();
      const db = await openDB('kaoto');
      const entries = (await db.getAll(`content:${id}`)) as { path: string; createdAt: number; updatedAt: number }[];
      db.close();
      const times = Object.fromEntries(entries.map(({ path, createdAt, updatedAt }) => [path, [createdAt, updatedAt]]));
      expect(times).toEqual({
        z: [1000, 2000],
        'z/sub': [1000, 2000],
        'z/b.yaml': [1000, 2000],
        outside: [1000, 1000],
      });
    });
  });

  describe('timestamps', () => {
    const at = (time: number) => vi.spyOn(Date, 'now').mockReturnValue(time);
    const project = async () => (await store.getProjects())[0];

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('gives a folder its creation time as both timestamps', async () => {
      at(1000);
      await store.createFolder('a');

      const { id } = await project();
      store.close();
      const db = await openDB('kaoto');
      expect(await db.getAll(`content:${id}`)).toEqual([
        { id: expect.any(String), path: 'a', kind: 'folder', createdAt: 1000, updatedAt: 1000 },
      ]);
      db.close();
    });

    it('keeps the creation time of a file when its content changes', async () => {
      at(1000);
      const file = await store.createFile({ path: 'a.yaml', content: '' });
      at(2000);
      const updated = await store.updateFile(file.id, 'x');

      expect(updated).toMatchObject({ createdAt: 1000, updatedAt: 2000 });
    });

    it('keeps the project creation time and moves its update time on every change', async () => {
      at(1000);
      await store.getFiles();
      const { createdAt } = await project();

      const changes: [number, () => Promise<unknown>][] = [
        [2000, () => store.createFolder('f')],
        [3000, () => store.createFile({ id: 'a', path: 'a.yaml', content: '' })],
        [4000, () => store.updateFile('a', 'x')],
        [5000, () => store.renameFile('a', 'b.yaml')],
        [6000, () => store.deleteFile('a')],
        [6500, () => store.renameFolder('f', 'g')],
        [7000, () => store.deleteFolder('g')],
      ];
      for (const [time, change] of changes) {
        at(time);
        await change();
        expect(await project()).toMatchObject({ createdAt, updatedAt: time });
      }
      expect(createdAt).toBe(1000);
    });
  });

  describe('database', () => {
    const storeNames = async () => {
      const db = await openDB('kaoto');
      const names = [...db.objectStoreNames];
      db.close();
      return names;
    };

    /** Creates the database as an earlier kaoto-web build left it, with one file */
    const createOldDatabase = async (withFolders: boolean) => {
      const db = await openDB('kaoto', withFolders ? 2 : 1, {
        upgrade(upgradeDb) {
          upgradeDb.createObjectStore('files', { keyPath: 'id' }).createIndex('byPath', 'path', { unique: true });
          if (withFolders) upgradeDb.createObjectStore('folders', { keyPath: 'path' });
        },
      });
      await db.add('files', { id: 'old', path: 'a/b.yaml', content: 'x', updatedAt: 1 });
      db.close();
    };

    it('creates the meta marker and one default project with its content table on a new database', async () => {
      const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
      await store.getFiles();
      now.mockRestore();
      store.close();

      const projects = await store.getProjects();
      expect(projects).toEqual([{ id: expect.any(String), name: 'Default', createdAt: 1000, updatedAt: 1000 }]);
      expect((await storeNames()).sort()).toEqual(['meta', 'projects', `content:${projects[0].id}`].sort());
      const db = await openDB('kaoto');
      expect(await db.get('meta', 'schema')).toEqual({ key: 'schema', version: 1 });
      db.close();
    });

    it.each([
      ['files', false],
      ['files and folders', true],
    ])('replaces an old database with %s and drops its data', async (_, withFolders) => {
      store.close();
      await createOldDatabase(withFolders);

      expect(await store.getFiles()).toEqual([]);
      expect(await store.getProjects()).toHaveLength(1);
      store.close();
      const names = await storeNames();
      expect(names).not.toContain('files');
      expect(names).not.toContain('folders');
    });

    it('creates one default project when two stores open a new database at once', async () => {
      const other = new FilesStore();

      await Promise.all([store.getFiles(), other.getFiles()]);

      expect(await store.getProjects()).toHaveLength(1);
      expect(await other.getProjects()).toEqual(await store.getProjects());
      other.close();
    });

    it('rejects when the schema marker is newer than the code', async () => {
      await store.getFiles();
      store.close();
      const db = await openDB('kaoto');
      await db.put('meta', { key: 'schema', version: 2 });
      db.close();

      await expect(new FilesStore().getFiles()).rejects.toThrow(/newer/);
    });

    it('lets another connection raise the version while this store is connected', async () => {
      await store.getFiles();
      const { version } = await openDB('kaoto').then((db) => {
        db.close();
        return db;
      });

      const upgraded = openDB('kaoto', version + 1);
      const timeout = new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve('blocked');
        }, 1000);
      });

      const result = await Promise.race([upgraded.then(() => 'opened'), timeout]);
      expect(result).toBe('opened');
      (await upgraded).close();
    });

    it('reconnects and keeps working after another connection raised the version', async () => {
      await store.createFile({ path: 'a.yaml', content: '' });
      const current = await openDB('kaoto');
      current.close();
      (await openDB('kaoto', current.version + 1)).close();

      expect((await store.getFiles()).map(({ path }) => path)).toEqual(['a.yaml']);
    });
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
