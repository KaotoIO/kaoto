import { beforeEach, describe, expect, it } from 'vitest';

import { AdapterEntry, FilesAdapter } from '../services/files/files-adapter';

const byPath = (a: AdapterEntry, b: AdapterEntry) => a.path.localeCompare(b.path);

/**
 * The behaviour every `FilesAdapter` shares, run against each adapter, so that the in-memory adapter of the tests
 * behaves like the real ones.
 *
 * @param create builds an empty adapter; it is called once per test
 */
export const describeFilesAdapter = (name: string, create: () => FilesAdapter | Promise<FilesAdapter>): void => {
  describe(`${name} (files adapter contract)`, () => {
    let adapter: FilesAdapter;

    beforeEach(async () => {
      adapter = await create();
    });

    const listed = async () => (await adapter.list()).sort(byPath);

    it('lists files and folders, including empty folders', async () => {
      await adapter.createFolder('a/empty');
      await adapter.createFile('a/b.yaml', 'x');

      expect(await listed()).toEqual([
        { kind: 'folder', path: 'a' },
        { kind: 'file', path: 'a/b.yaml' },
        { kind: 'folder', path: 'a/empty' },
      ]);
    });

    it('reads what was written', async () => {
      await adapter.createFile('f.yaml', '1');

      await adapter.writeFile('f.yaml', '2');

      expect(await adapter.readFile('f.yaml')).toBe('2');
    });

    it.each<[string, (adapter: FilesAdapter) => Promise<void>]>([
      ['a file on a file', (a) => a.createFile('taken.yaml', '')],
      ['a file on a folder', (a) => a.createFile('folder', '')],
      ['a folder on a file', (a) => a.createFolder('taken.yaml')],
      ['a folder on a folder', (a) => a.createFolder('folder')],
      ['a file moved onto a file', (a) => a.moveFile('other.yaml', 'taken.yaml')],
      ['a folder moved onto a folder', (a) => a.moveFolder('other', 'folder')],
    ])('rejects %s', async (_, change) => {
      await adapter.createFile('taken.yaml', 'taken');
      await adapter.createFile('other.yaml', 'other');
      await adapter.createFolder('folder');
      await adapter.createFolder('other');
      const before = await listed();

      await expect(change(adapter)).rejects.toThrow();

      expect(await listed()).toEqual(before);
      expect(await adapter.readFile('taken.yaml')).toBe('taken');
    });

    it('rejects a file under a file', async () => {
      await adapter.createFile('f.yaml', '');

      await expect(adapter.createFile('f.yaml/x.yaml', '')).rejects.toThrow();
    });

    it.each<[string, (adapter: FilesAdapter) => Promise<unknown>]>([
      ['reading', (a) => a.readFile('missing.yaml')],
      ['writing', (a) => a.writeFile('missing.yaml', '')],
      ['moving', (a) => a.moveFile('missing.yaml', 'moved.yaml')],
      ['removing', (a) => a.removeFile('missing.yaml')],
      ['reading a folder', (a) => a.readFile('folder')],
      ['moving a missing folder', (a) => a.moveFolder('missing', 'moved')],
    ])('rejects %s a missing file', async (_, change) => {
      await adapter.createFolder('folder');

      await expect(change(adapter)).rejects.toThrow();
    });

    it.each<[string, (adapter: FilesAdapter) => Promise<void>, string[]]>([
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
      await change(adapter);

      expect((await listed()).map(({ path }) => path)).toEqual(paths);
    });

    it('moves a file and keeps its content', async () => {
      await adapter.createFile('a.yaml', 'content');

      await adapter.moveFile('a.yaml', 'b.yaml');

      expect(await listed()).toEqual([{ kind: 'file', path: 'b.yaml' }]);
      expect(await adapter.readFile('b.yaml')).toBe('content');
    });

    it('moves a folder with everything under it and keeps the contents', async () => {
      await adapter.createFile('a/b.yaml', 'b');
      await adapter.createFolder('a/c/empty');
      await adapter.createFile('ab.yaml', 'outside');

      await adapter.moveFolder('a', 'z');

      expect(await listed()).toEqual([
        { kind: 'file', path: 'ab.yaml' },
        { kind: 'folder', path: 'z' },
        { kind: 'file', path: 'z/b.yaml' },
        { kind: 'folder', path: 'z/c' },
        { kind: 'folder', path: 'z/c/empty' },
      ]);
      expect(await adapter.readFile('z/b.yaml')).toBe('b');
    });

    it('rejects moving a folder into itself', async () => {
      await adapter.createFolder('a');

      await expect(adapter.moveFolder('a', 'a/inner')).rejects.toThrow();
    });

    it('removes a folder with everything under it and nothing outside it', async () => {
      await adapter.createFile('a/b/c.yaml', '');
      await adapter.createFile('ab/c.yaml', '');

      await adapter.removeFolder('a');

      expect(await listed()).toEqual([
        { kind: 'folder', path: 'ab' },
        { kind: 'file', path: 'ab/c.yaml' },
      ]);
    });

    it('rejects removing a file as a folder and keeps the file', async () => {
      await adapter.createFile('keep.yaml', 'content');

      await expect(adapter.removeFolder('keep.yaml')).rejects.toThrow();

      expect(await adapter.readFile('keep.yaml')).toBe('content');
    });

    it('removes a file', async () => {
      await adapter.createFile('a/b.yaml', '');

      await adapter.removeFile('a/b.yaml');

      expect(await listed()).toEqual([{ kind: 'folder', path: 'a' }]);
    });
  });
};
