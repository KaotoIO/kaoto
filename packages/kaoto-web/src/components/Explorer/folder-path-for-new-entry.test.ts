import { FileEntry } from '../../store/files/files-ui-state';
import { getFolderPathForNewEntry, ROOT_TARGET } from './folder-path-for-new-entry';

const entries: Pick<FileEntry, 'key' | 'kind' | 'path'>[] = [
  { key: 'k-routes', kind: 'folder', path: 'routes' },
  { key: 'k-orders', kind: 'folder', path: 'routes/orders' },
  { key: 'k-a', kind: 'file', path: 'routes/orders/a.camel.yaml' },
  { key: 'k-b', kind: 'file', path: 'routes/b.camel.yaml' },
  { key: 'k-root', kind: 'file', path: 'root.camel.yaml' },
];

describe('getFolderPathForNewEntry', () => {
  it.each([
    ['the root after a click on the free space, also with an open file', ROOT_TARGET, 'k-a', ''],
    ['the last focused folder', 'k-orders', 'k-b', 'routes/orders'],
    ['the folder of the last focused file', 'k-b', 'k-a', 'routes'],
    ['the folder of the open file when the last focused entry is gone', 'k-deleted', 'k-a', 'routes/orders'],
    ['the folder of the open file when nothing was focused', undefined, 'k-b', 'routes'],
    ['the root for an open file at the root', undefined, 'k-root', ''],
    ['the root when nothing was focused and no file is open', undefined, undefined, ''],
  ])('takes %s', (_, lastFocusedKey, openFileKey, folderPath) => {
    expect(getFolderPathForNewEntry(entries, lastFocusedKey, openFileKey)).toBe(folderPath);
  });
});
