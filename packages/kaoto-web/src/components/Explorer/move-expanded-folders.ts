import { toFolderId, toFolderPath } from './build-tree';

const isInFolder = (path: string, folderPath: string) => path === folderPath || path.startsWith(`${folderPath}/`);

/**
 * Moves the expansion state of a renamed folder and its subfolders to their new folder ids, which follow the paths.
 * Entries left at the new path, by a folder deleted earlier, are dropped first, so that they cannot override the moved
 * ones. Folders outside both paths keep their state.
 */
export const moveExpandedFolders = (
  expandedFolders: Record<string, boolean>,
  fromPath: string,
  toPath: string,
): Record<string, boolean> =>
  Object.fromEntries(
    Object.entries(expandedFolders)
      .filter(([id]) => {
        const path = toFolderPath(id);
        return !isInFolder(path, toPath) || isInFolder(path, fromPath);
      })
      .map(([id, expanded]) => {
        const path = toFolderPath(id);
        return [isInFolder(path, fromPath) ? toFolderId(`${toPath}${path.slice(fromPath.length)}`) : id, expanded];
      }),
  );
