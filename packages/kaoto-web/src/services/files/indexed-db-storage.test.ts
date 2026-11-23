import { randomUUID } from 'node:crypto';

import { openDB } from 'idb';

import { describeFilesStorage } from '../../test/files-storage-contract';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { IndexedDbStorage } from './indexed-db-storage';

describe('IndexedDbStorage', () => {
  let storage: IndexedDbStorage;

  beforeEach(() => {
    resetTestIndexedDB();
    // jsdom does not provide crypto.randomUUID
    vi.stubGlobal('crypto', { randomUUID });
    storage = new IndexedDbStorage();
  });

  afterEach(() => {
    storage.close();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describeFilesStorage('IndexedDbStorage', () => storage);

  const at = (time: number) => vi.spyOn(Date, 'now').mockReturnValue(time);

  /** The stored records of the default project, read past the storage */
  const storedRecords = async () => {
    const { id } = (await storage.getProjects())[0];
    storage.close();
    const db = await openDB('kaoto');
    const records = (await db.getAll(`content:${id}`)) as {
      id: string;
      path: string;
      kind: string;
      createdAt: number;
      updatedAt: number;
    }[];
    db.close();
    return records;
  };

  it('keeps the files and folders in the browser storage for the next visit', async () => {
    await storage.createFile('routes/a.camel.yaml', 'content');
    storage.close();

    storage = new IndexedDbStorage();

    expect(await storage.list()).toEqual([
      { kind: 'folder', path: 'routes' },
      { kind: 'file', path: 'routes/a.camel.yaml' },
    ]);
    expect(await storage.readFile('routes/a.camel.yaml')).toBe('content');
  });

  it('rejects writing a missing file without leaving an unhandled rejection', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      await expect(storage.writeFile('missing.yaml', 'x')).rejects.toThrow('The file missing.yaml does not exist');
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  describe('timestamps', () => {
    it('gives a file and a folder their creation time as both timestamps and a generated id', async () => {
      at(1000);
      await storage.createFile('a/b.yaml', '');

      expect(await storedRecords()).toEqual(
        expect.arrayContaining([
          { id: expect.any(String), path: 'a', kind: 'folder', createdAt: 1000, updatedAt: 1000 },
          expect.objectContaining({ path: 'a/b.yaml', kind: 'file', createdAt: 1000, updatedAt: 1000 }),
        ]),
      );
    });

    it('keeps the creation time and the id of a file and moves its update time when it changes or moves', async () => {
      at(1000);
      await storage.createFile('a.yaml', '');
      const [{ id }] = await storedRecords();
      storage = new IndexedDbStorage();

      at(2000);
      await storage.writeFile('a.yaml', 'x');
      at(3000);
      await storage.moveFile('a.yaml', 'b.yaml');

      expect(await storedRecords()).toEqual([
        expect.objectContaining({ id, path: 'b.yaml', createdAt: 1000, updatedAt: 3000 }),
      ]);
    });

    it('moves the update time of a moved folder and of every entry it holds, as their paths change', async () => {
      at(1000);
      await storage.createFolder('a/sub');
      await storage.createFile('a/b.yaml', '');
      await storage.createFolder('outside');
      at(2000);

      await storage.moveFolder('a', 'z');

      const times = Object.fromEntries(
        (await storedRecords()).map(({ path, createdAt, updatedAt }) => [path, [createdAt, updatedAt]]),
      );
      expect(times).toEqual({
        z: [1000, 2000],
        'z/sub': [1000, 2000],
        'z/b.yaml': [1000, 2000],
        outside: [1000, 1000],
      });
    });

    it('keeps the project creation time and moves its update time on every change', async () => {
      at(1000);
      await storage.list();
      const project = async () => (await storage.getProjects())[0];
      const { createdAt } = await project();

      const changes: [number, () => Promise<unknown>][] = [
        [2000, () => storage.createFolder('f')],
        [3000, () => storage.createFile('a.yaml', '')],
        [4000, () => storage.writeFile('a.yaml', 'x')],
        [5000, () => storage.moveFile('a.yaml', 'b.yaml')],
        [6000, () => storage.removeFile('b.yaml')],
        [6500, () => storage.moveFolder('f', 'g')],
        [7000, () => storage.removeFolder('g')],
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
      at(1000);
      await storage.list();
      vi.restoreAllMocks();
      storage.close();

      const projects = await storage.getProjects();
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
      storage.close();
      await createOldDatabase(withFolders);

      expect(await storage.list()).toEqual([]);
      expect(await storage.getProjects()).toHaveLength(1);
      storage.close();
      const names = await storeNames();
      expect(names).not.toContain('files');
      expect(names).not.toContain('folders');
    });

    it('creates one default project when two storages open a new database at once', async () => {
      const other = new IndexedDbStorage();

      await Promise.all([storage.list(), other.list()]);

      expect(await storage.getProjects()).toHaveLength(1);
      expect(await other.getProjects()).toEqual(await storage.getProjects());
      other.close();
    });

    it('rejects when the schema marker is newer than the code', async () => {
      await storage.list();
      storage.close();
      const db = await openDB('kaoto');
      await db.put('meta', { key: 'schema', version: 2 });
      db.close();

      await expect(new IndexedDbStorage().list()).rejects.toThrow(/newer/);
    });

    it('lets another connection raise the version while this storage is connected', async () => {
      await storage.list();
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
      await storage.createFile('a.yaml', '');
      const current = await openDB('kaoto');
      current.close();
      (await openDB('kaoto', current.version + 1)).close();

      expect(await storage.list()).toEqual([{ kind: 'file', path: 'a.yaml' }]);
    });
  });

  it('rejects when IndexedDB is unavailable', async () => {
    // @ts-expect-error simulating a browser without IndexedDB
    globalThis.indexedDB = undefined;
    const unavailable = new IndexedDbStorage();

    await expect(unavailable.list()).rejects.toThrow();
  });

  it('opens the database again after a failed attempt', async () => {
    // @ts-expect-error simulating a browser where IndexedDB is not available yet
    globalThis.indexedDB = undefined;
    const retrying = new IndexedDbStorage();
    await expect(retrying.list()).rejects.toThrow();

    resetTestIndexedDB();

    expect(await retrying.list()).toEqual([]);
    retrying.close();
  });
});
