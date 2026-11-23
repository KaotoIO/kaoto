import { describe, expect, it } from 'vitest';

import { describeFilesAdapter } from './files-adapter-contract';
import { InMemoryFilesAdapter } from './in-memory-files-adapter';

describeFilesAdapter('InMemoryFilesAdapter', () => new InMemoryFilesAdapter());

describe('InMemoryFilesAdapter', () => {
  it('starts with the given files and folders and their parents', async () => {
    const adapter = new InMemoryFilesAdapter([
      { kind: 'file', path: 'a/b.yaml', content: 'b' },
      { kind: 'folder', path: 'c' },
    ]);

    expect(await adapter.list()).toEqual(
      expect.arrayContaining([
        { kind: 'folder', path: 'a' },
        { kind: 'file', path: 'a/b.yaml' },
        { kind: 'folder', path: 'c' },
      ]),
    );
    expect(await adapter.readFile('a/b.yaml')).toBe('b');
  });

  it('waits with reads until they are released', async () => {
    const adapter = new InMemoryFilesAdapter([{ kind: 'file', path: 'a.yaml', content: 'a' }]);
    const reads = adapter.delayReads();
    let content: string | undefined;

    const read = adapter.readFile('a.yaml').then((value) => {
      content = value;
    });
    await Promise.resolve();
    expect(content).toBeUndefined();

    reads.release();
    await read;
    expect(content).toBe('a');
  });
});
