import { toFolderId } from './build-tree';
import { moveExpandedFolders } from './move-expanded-folders';

const expanded = (entries: Record<string, boolean>) =>
  Object.fromEntries(Object.entries(entries).map(([path, value]) => [toFolderId(path), value]));

describe('moveExpandedFolders', () => {
  it('moves the state of the folder and its subfolders to their new paths', () => {
    const result = moveExpandedFolders(expanded({ a: true, 'a/b': false, 'a/b/c': true }), 'a', 'z');

    expect(result).toEqual(expanded({ z: true, 'z/b': false, 'z/b/c': true }));
  });

  it('keeps the state of folders outside the renamed one, also those whose name starts the same', () => {
    const result = moveExpandedFolders(expanded({ a: true, ab: false, other: true }), 'a', 'z');

    expect(result).toEqual(expanded({ z: true, ab: false, other: true }));
  });

  it('drops the state left at the new path by a deleted folder', () => {
    const result = moveExpandedFolders(expanded({ a: true, z: false, 'z/old': true }), 'a', 'z');

    expect(result).toEqual(expanded({ z: true }));
  });

  it('keeps the state of the parent folder of a nested folder', () => {
    const result = moveExpandedFolders(expanded({ p: true, 'p/a': true, 'p/a/b': false }), 'p/a', 'p/z');

    expect(result).toEqual(expanded({ p: true, 'p/z': true, 'p/z/b': false }));
  });
});
