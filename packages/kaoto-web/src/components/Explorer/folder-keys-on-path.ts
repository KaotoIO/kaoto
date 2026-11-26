import { FileEntry } from '../../store/files/files-ui-state';

/** The folder paths from the outermost folder down to the folder itself */
const folderAndParents = (folderPath: string): string[] =>
  folderPath ? folderPath.split('/').map((_, index, segments) => segments.slice(0, index + 1).join('/')) : [];

/**
 * The keys of the folder and of all folders above it, outermost first: the folders that must be expanded for the
 * folder to show. A folder that is not among the entries is skipped.
 *
 * @param folderPath `/`-separated, empty for the root
 */
export const getFolderKeysOnPath = (
  entries: readonly Pick<FileEntry, 'key' | 'path'>[],
  folderPath: string,
): string[] => folderAndParents(folderPath).flatMap((path) => entries.find((entry) => entry.path === path)?.key ?? []);
