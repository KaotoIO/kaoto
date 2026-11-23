import { describe, expect, it } from 'vitest';

import { describeFilesStorage } from './files-storage-contract';
import { InMemoryStorage } from './in-memory-storage';

describeFilesStorage('InMemoryStorage', () => new InMemoryStorage());

describe('InMemoryStorage', () => {
  it('starts with the given files and folders and their parents', async () => {
    const storage = new InMemoryStorage([
      { kind: 'file', path: 'a/b.yaml', content: 'b' },
      { kind: 'folder', path: 'c' },
    ]);

    expect(await storage.list()).toEqual(
      expect.arrayContaining([
        { kind: 'folder', path: 'a' },
        { kind: 'file', path: 'a/b.yaml' },
        { kind: 'folder', path: 'c' },
      ]),
    );
    expect(await storage.readFile('a/b.yaml')).toBe('b');
  });

  it('waits with reads until they are released', async () => {
    const storage = new InMemoryStorage([{ kind: 'file', path: 'a.yaml', content: 'a' }]);
    const reads = storage.delayReads();
    let content: string | undefined;

    const read = storage.readFile('a.yaml').then((value) => {
      content = value;
    });
    await Promise.resolve();
    expect(content).toBeUndefined();

    reads.release();
    await read;
    expect(content).toBe('a');
  });
});
