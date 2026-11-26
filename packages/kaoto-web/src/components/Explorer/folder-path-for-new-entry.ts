import { parentFolderOf } from '../../services/files/file-path';
import { FileEntry } from '../../store/files/files-ui-state';

/** Stands for the root in the last focused tree item, after a click on the free space of the tree */
export const ROOT_TARGET = 'root:';

/**
 * The folder a new entry goes into: the last focused tree item's, else the open file's, else the root.
 *
 * @param lastFocusedKey the key of the last focused tree item, or {@link ROOT_TARGET}
 * @param openFileKey the key of the open file
 * @returns `/`-separated, empty for the root
 */
export function getFolderPathForNewEntry(
  entries: readonly Pick<FileEntry, 'key' | 'kind' | 'path'>[],
  lastFocusedKey: string | undefined,
  openFileKey: string | undefined,
): string {
  if (lastFocusedKey === ROOT_TARGET) return '';
  // A folder that was deleted since is gone from the entries; a renamed one keeps its key and is found
  const focused = entries.find(({ key }) => key === lastFocusedKey);
  if (focused?.kind === 'folder') return focused.path;
  const file = focused ?? entries.find(({ key }) => key === openFileKey);
  return file ? parentFolderOf(file.path) : '';
}
