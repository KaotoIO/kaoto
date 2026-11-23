import { describe, expect, it } from 'vitest';

import { selectEntry, selectEntryByPath } from './files-ui-selectors';
import { FileEntry, FilesState } from './files-ui-state';

const file: FileEntry = { key: 'k1', kind: 'file', path: 'a/b.yaml', name: 'b.yaml' };
const state = { entries: [file] } as FilesState;

describe('files selectors', () => {
  it.each([
    ['k1', file],
    ['k2', undefined],
  ])('selects the entry with the key %s', (key, expected) => {
    expect(selectEntry(key)(state)).toBe(expected);
  });

  it.each([
    ['a/b.yaml', file],
    ['a', undefined],
  ])('selects the entry at the path %s', (path, expected) => {
    expect(selectEntryByPath(path)(state)).toBe(expected);
  });
});
