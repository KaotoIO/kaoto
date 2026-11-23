import { beforeEach, describe, expect, it } from 'vitest';

import { FilesStorage, StorageEntry } from '../services/files/files-storage';

const byPath = (a: StorageEntry, b: StorageEntry) => a.path.localeCompare(b.path);

/**
 * The behaviour every `FilesStorage` shares, run against each storage, so that the in-memory storage of the tests
 * behaves like the real ones.
 *
 * @param create builds an empty storage; it is called once per test
 */
export const describeFilesStorage = (name: string, create: () => FilesStorage | Promise<FilesStorage>): void => {
  describe(`${name} (files storage contract)`, () => {
    let storage: FilesStorage;

    beforeEach(async () => {
      storage = await create();
    });

    const listed = async () => (await storage.list()).sort(byPath);

    it('lists files and folders, including empty folders', async () => {
      await storage.createFolder('a/empty');
      await storage.createFile('a/b.yaml', 'x');

      expect(await listed()).toEqual([
        { kind: 'folder', path: 'a' },
        { kind: 'file', path: 'a/b.yaml' },
        { kind: 'folder', path: 'a/empty' },
      ]);
    });

    it('reads what was written', async () => {
      await storage.createFile('f.yaml', '1');

      await storage.writeFile('f.yaml', '2');

      expect(await storage.readFile('f.yaml')).toBe('2');
    });

    it.each<[string, (storage: FilesStorage) => Promise<void>]>([
      ['a file on a file', (a) => a.createFile('taken.yaml', '')],
      ['a file on a folder', (a) => a.createFile('folder', '')],
      ['a folder on a file', (a) => a.createFolder('taken.yaml')],
      ['a folder on a folder', (a) => a.createFolder('folder')],
      ['a file moved onto a file', (a) => a.moveFile('other.yaml', 'taken.yaml')],
      ['a folder moved onto a folder', (a) => a.moveFolder('other', 'folder')],
    ])('rejects %s', async (_, change) => {
      await storage.createFile('taken.yaml', 'taken');
      await storage.createFile('other.yaml', 'other');
      await storage.createFolder('folder');
      await storage.createFolder('other');
      const before = await listed();

      await expect(change(storage)).rejects.toThrow();

      expect(await listed()).toEqual(before);
      expect(await storage.readFile('taken.yaml')).toBe('taken');
    });

    it('rejects a file under a file', async () => {
      await storage.createFile('f.yaml', '');

      await expect(storage.createFile('f.yaml/x.yaml', '')).rejects.toThrow();
    });

    it.each<[string, (storage: FilesStorage) => Promise<unknown>]>([
      ['reading', (a) => a.readFile('missing.yaml')],
      ['writing', (a) => a.writeFile('missing.yaml', '')],
      ['moving', (a) => a.moveFile('missing.yaml', 'moved.yaml')],
      ['removing', (a) => a.removeFile('missing.yaml')],
      ['reading a folder', (a) => a.readFile('folder')],
      ['moving a missing folder', (a) => a.moveFolder('missing', 'moved')],
    ])('rejects %s a missing file', async (_, change) => {
      await storage.createFolder('folder');

      await expect(change(storage)).rejects.toThrow();
    });

    it.each<[string, (storage: FilesStorage) => Promise<void>, string[]]>([
      ['a file', (a) => a.createFile('p/q/r.yaml', ''), ['p', 'p/q', 'p/q/r.yaml']],
      ['a folder', (a) => a.createFolder('s/t'), ['s', 's/t']],
      [
        'a moved file',
        async (a) => {
          await a.createFile('f.yaml', '');
          await a.moveFile('f.yaml', 'u/v.yaml');
        },
        ['u', 'u/v.yaml'],
      ],
    ])('creates the missing parent folders of %s', async (_, change, paths) => {
      await change(storage);

      expect((await listed()).map(({ path }) => path)).toEqual(paths);
    });

    it('moves a file and keeps its content', async () => {
      await storage.createFile('a.yaml', 'content');

      await storage.moveFile('a.yaml', 'b.yaml');

      expect(await listed()).toEqual([{ kind: 'file', path: 'b.yaml' }]);
      expect(await storage.readFile('b.yaml')).toBe('content');
    });

    it('moves a folder with everything under it and keeps the contents', async () => {
      await storage.createFile('a/b.yaml', 'b');
      await storage.createFolder('a/c/empty');
      await storage.createFile('ab.yaml', 'outside');

      await storage.moveFolder('a', 'z');

      expect(await listed()).toEqual([
        { kind: 'file', path: 'ab.yaml' },
        { kind: 'folder', path: 'z' },
        { kind: 'file', path: 'z/b.yaml' },
        { kind: 'folder', path: 'z/c' },
        { kind: 'folder', path: 'z/c/empty' },
      ]);
      expect(await storage.readFile('z/b.yaml')).toBe('b');
    });

    it('rejects moving a folder into itself', async () => {
      await storage.createFolder('a');

      await expect(storage.moveFolder('a', 'a/inner')).rejects.toThrow();
    });

    it('removes a folder with everything under it and nothing outside it', async () => {
      await storage.createFile('a/b/c.yaml', '');
      await storage.createFile('ab/c.yaml', '');

      await storage.removeFolder('a');

      expect(await listed()).toEqual([
        { kind: 'folder', path: 'ab' },
        { kind: 'file', path: 'ab/c.yaml' },
      ]);
    });

    it('rejects removing a file as a folder and keeps the file', async () => {
      await storage.createFile('keep.yaml', 'content');

      await expect(storage.removeFolder('keep.yaml')).rejects.toThrow();

      expect(await storage.readFile('keep.yaml')).toBe('content');
    });

    it('removes a file', async () => {
      await storage.createFile('a/b.yaml', '');

      await storage.removeFile('a/b.yaml');

      expect(await listed()).toEqual([{ kind: 'folder', path: 'a' }]);
    });
  });
};
