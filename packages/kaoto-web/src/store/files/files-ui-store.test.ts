import { describe, expect, it, vi } from 'vitest';

import { InMemoryStorage } from '../../test/in-memory-storage';
import { FileEntry, FilesState } from './files-ui-state';
import { createFilesUiStore } from './files-ui-store';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const paths = (state: FilesState) => state.entries.map(({ path }) => path);

const entryAt = (state: FilesState, path: string): FileEntry => {
  const entry = state.entries.find((candidate) => candidate.path === path);
  if (!entry) throw new Error(`No entry at ${path}`);
  return entry;
};

/** A store over an in-memory storage, loaded */
const loadedStore = async (initial: ConstructorParameters<typeof InMemoryStorage>[0] = []) => {
  const storage = new InMemoryStorage(initial);
  const store = createFilesUiStore(storage);
  await store.getState().load();
  return { storage, store };
};

describe('createFilesUiStore', () => {
  it('starts loading and loads nothing on its own', async () => {
    const storage = new InMemoryStorage([{ kind: 'file', path: 'a.yaml', content: '' }]);
    const list = vi.spyOn(storage, 'list');

    const store = createFilesUiStore(storage);

    expect(store.getState()).toMatchObject({ status: 'loading', entries: [], error: undefined });
    expect(list).not.toHaveBeenCalled();
  });

  it('loads the entries sorted by path with a unique key and a name each', async () => {
    const { store } = await loadedStore([
      { kind: 'file', path: 'b/c.camel.yaml', content: '' },
      { kind: 'folder', path: 'a' },
    ]);

    const { status, entries } = store.getState();
    expect(status).toBe('ready');
    expect(entries.map(({ kind, path, name }) => ({ kind, path, name }))).toEqual([
      { kind: 'folder', path: 'a', name: 'a' },
      { kind: 'folder', path: 'b', name: 'b' },
      { kind: 'file', path: 'b/c.camel.yaml', name: 'c.camel.yaml' },
    ]);
    expect(entries.every(({ key }) => UUID.test(key))).toBe(true);
    expect(new Set(entries.map(({ key }) => key)).size).toBe(3);
  });

  it('reports a failed load and loads again on the next call', async () => {
    const storage = new InMemoryStorage([{ kind: 'file', path: 'a.yaml', content: '' }]);
    vi.spyOn(storage, 'list').mockRejectedValueOnce(new Error('blocked'));
    const store = createFilesUiStore(storage);

    await store.getState().load();
    expect(store.getState()).toMatchObject({ status: 'error', entries: [], error: new Error('blocked') });

    await store.getState().load();
    expect(store.getState()).toMatchObject({ status: 'ready', error: undefined });
    expect(paths(store.getState())).toEqual(['a.yaml']);
  });

  it('shows the loading state again while it loads again', async () => {
    const { store } = await loadedStore([{ kind: 'file', path: 'a.yaml', content: '' }]);

    const loading = store.getState().load();

    expect(store.getState().status).toBe('loading');
    await loading;
    expect(store.getState().status).toBe('ready');
  });

  it('wraps a rejection that is no Error in an Error', async () => {
    const storage = new InMemoryStorage();
    vi.spyOn(storage, 'list').mockRejectedValueOnce('blocked');
    const store = createFilesUiStore(storage);

    await store.getState().load();

    expect(store.getState().error).toEqual(new Error('blocked'));
  });

  it('adds a file and its missing parent folders once the storage stored it', async () => {
    const { storage, store } = await loadedStore([{ kind: 'folder', path: 'a' }]);
    const folderKey = entryAt(store.getState(), 'a').key;

    const added = await store.getState().addFile('a/b/c.yaml', 'x');

    expect(added).toMatchObject({ kind: 'file', path: 'a/b/c.yaml', name: 'c.yaml' });
    expect(paths(store.getState())).toEqual(['a', 'a/b', 'a/b/c.yaml']);
    expect(entryAt(store.getState(), 'a').key).toBe(folderKey);
    expect(entryAt(store.getState(), 'a/b/c.yaml').key).toBe(added.key);
    expect(await storage.readFile('a/b/c.yaml')).toBe('x');
  });

  it('adds a folder and its missing parent folders', async () => {
    const { store } = await loadedStore();

    const added = await store.getState().addFolder('a/b');

    expect(added).toMatchObject({ kind: 'folder', path: 'a/b', name: 'b' });
    expect(paths(store.getState())).toEqual(['a', 'a/b']);
  });

  it.each<[string, (state: FilesState) => Promise<unknown>]>([
    ['adding a file on a taken path', (state) => state.addFile('a/b.yaml', '')],
    ['adding a folder on a taken path', (state) => state.addFolder('a')],
    ['moving a file onto a taken path', (state) => state.moveFile(entryAt(state, 'c.yaml').key, 'a/b.yaml')],
    ['moving a folder into itself', (state) => state.moveFolder(entryAt(state, 'a').key, 'a/inner')],
  ])('leaves the entries unchanged when the storage refuses %s', async (_, change) => {
    const { store } = await loadedStore([
      { kind: 'file', path: 'a/b.yaml', content: '' },
      { kind: 'file', path: 'c.yaml', content: '' },
    ]);
    const before = store.getState().entries;

    await expect(change(store.getState())).rejects.toThrow(Error);

    expect(store.getState().entries).toBe(before);
  });

  it('keeps the key of a moved file and resolves with its new path and name', async () => {
    const { storage, store } = await loadedStore([{ kind: 'file', path: 'a.yaml', content: 'x' }]);
    const { key } = entryAt(store.getState(), 'a.yaml');

    const moved = await store.getState().moveFile(key, 'routes/b.yaml');

    expect(moved).toMatchObject({ key, path: 'routes/b.yaml', name: 'b.yaml' });
    expect(paths(store.getState())).toEqual(['routes', 'routes/b.yaml']);
    expect(await storage.readFile('routes/b.yaml')).toBe('x');
  });

  it('moves a folder with every entry under it and keeps all their keys', async () => {
    const { store } = await loadedStore([
      { kind: 'file', path: 'a/b/c.yaml', content: '' },
      { kind: 'file', path: 'ab.yaml', content: '' },
    ]);
    const keys = Object.fromEntries(store.getState().entries.map(({ path, key }) => [path, key]));

    await store.getState().moveFolder(keys.a, 'x/z');

    expect(store.getState().entries.map(({ path, key }) => [path, key])).toEqual([
      ['ab.yaml', keys['ab.yaml']],
      ['x', expect.stringMatching(UUID)],
      ['x/z', keys.a],
      ['x/z/b', keys['a/b']],
      ['x/z/b/c.yaml', keys['a/b/c.yaml']],
    ]);
    expect(entryAt(store.getState(), 'x/z/b').name).toBe('b');
  });

  it('removes a file', async () => {
    const { store } = await loadedStore([
      { kind: 'file', path: 'a.yaml', content: '' },
      { kind: 'file', path: 'b.yaml', content: '' },
    ]);

    await store.getState().removeFile(entryAt(store.getState(), 'a.yaml').key);

    expect(paths(store.getState())).toEqual(['b.yaml']);
  });

  it('removes a folder with every entry under it and nothing else', async () => {
    const { storage, store } = await loadedStore([
      { kind: 'file', path: 'a/b/c.yaml', content: '' },
      { kind: 'file', path: 'ab/c.yaml', content: '' },
    ]);

    await store.getState().removeFolder(entryAt(store.getState(), 'a').key);

    expect(paths(store.getState())).toEqual(['ab', 'ab/c.yaml']);
    expect((await storage.list()).map(({ path }) => path)).toEqual(['ab', 'ab/c.yaml']);
  });

  it('passes the content through to the storage without keeping it', async () => {
    const { storage, store } = await loadedStore([{ kind: 'file', path: 'a.yaml', content: 'old' }]);
    const { key } = entryAt(store.getState(), 'a.yaml');

    await store.getState().setFileContent(key, 'new');
    expect(await storage.readFile('a.yaml')).toBe('new');

    await storage.writeFile('a.yaml', 'changed elsewhere');
    expect(await store.getState().getFileContent(key)).toBe('changed elsewhere');
  });

  it('reads the content after a pending write of the same file', async () => {
    const { storage, store } = await loadedStore([{ kind: 'file', path: 'a.yaml', content: 'old' }]);
    const { key } = entryAt(store.getState(), 'a.yaml');
    const write = storage.writeFile.bind(storage);
    vi.spyOn(storage, 'writeFile').mockImplementationOnce(async (path, content) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      await write(path, content);
    });

    const saving = store.getState().setFileContent(key, 'new');

    expect(await store.getState().getFileContent(key)).toBe('new');
    await saving;
  });

  it('reads from the new path once a pending move of the file is done', async () => {
    const { store } = await loadedStore([{ kind: 'file', path: 'a.yaml', content: 'x' }]);
    const { key } = entryAt(store.getState(), 'a.yaml');

    const moving = store.getState().moveFile(key, 'b.yaml');

    expect(await store.getState().getFileContent(key)).toBe('x');
    await moving;
  });

  it.each<[string, (state: FilesState, key: string) => Promise<unknown>]>([
    ['reading', (state, key) => state.getFileContent(key)],
    ['writing', (state, key) => state.setFileContent(key, '')],
    ['moving', (state, key) => state.moveFile(key, 'b.yaml')],
    ['removing', (state, key) => state.removeFile(key)],
    ['moving a folder', (state, key) => state.moveFolder(key, 'b')],
    ['removing a folder', (state, key) => state.removeFolder(key)],
  ])('rejects %s an unknown key', async (_, change) => {
    const { store } = await loadedStore([{ kind: 'file', path: 'a.yaml', content: '' }]);

    await expect(change(store.getState(), 'unknown')).rejects.toThrow('There is no entry unknown');
  });

  it.each<[string, (state: FilesState) => Promise<unknown>]>([
    ['reading a folder', (state) => state.getFileContent(entryAt(state, 'a').key)],
    ['moving a folder as a file', (state) => state.moveFile(entryAt(state, 'a').key, 'b')],
    ['moving a file as a folder', (state) => state.moveFolder(entryAt(state, 'a/f.yaml').key, 'b')],
  ])('rejects %s', async (_, change) => {
    const { store } = await loadedStore([{ kind: 'file', path: 'a/f.yaml', content: '' }]);

    await expect(change(store.getState())).rejects.toThrow(Error);
  });
});
