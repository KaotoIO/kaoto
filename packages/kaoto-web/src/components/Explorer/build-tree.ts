import { getFileType } from '../../services/files/stored-file';
import { FileEntry } from '../../store/files/files-ui-state';
import { ExplorerFile } from './explorer-file';

/** Natural order: case-insensitive, numbers compared by value (`file2` before `file10`) */
const byName = (a: ExplorerFile, b: ExplorerFile) =>
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

const sortNodes = (nodes: ExplorerFile[]): ExplorerFile[] => {
  const folders: ExplorerFile[] = [];
  const files: ExplorerFile[] = [];
  for (const node of nodes) {
    if (node.children) {
      folders.push({ ...node, children: sortNodes(node.children) });
    } else {
      files.push(node);
    }
  }
  return [...folders.sort(byName), ...files.sort(byName)];
};

/**
 * Builds the Explorer tree from the entries of the files store.
 *
 * Every node takes the key of its entry as its id. The type of a file is derived from its path. A folder that is not
 * among the entries is added for the entries under it. Folders come before files, each in natural order by name.
 */
export function buildTree(entries: Pick<FileEntry, 'key' | 'kind' | 'path'>[]): ExplorerFile[] {
  const root: ExplorerFile[] = [];
  const folders = new Map<string, ExplorerFile>();

  /** The folder node at the path, creating it and its parents in the tree when needed */
  const folderAt = (folderPath: string, key?: string): ExplorerFile => {
    let folder = folders.get(folderPath);
    if (!folder) {
      const slash = folderPath.lastIndexOf('/');
      folder = {
        id: key ?? `folder:${folderPath}`,
        path: folderPath,
        name: folderPath.slice(slash + 1),
        type: 'folder',
        children: [],
      };
      folders.set(folderPath, folder);
      siblingsOf(folderPath).push(folder);
    } else if (key) {
      folder.id = key;
    }
    return folder;
  };

  const siblingsOf = (path: string): ExplorerFile[] => {
    const slash = path.lastIndexOf('/');
    return slash === -1 ? root : folderAt(path.slice(0, slash)).children!;
  };

  for (const entry of entries) {
    if (entry.kind === 'folder') {
      folderAt(entry.path, entry.key);
    } else {
      const name = entry.path.slice(entry.path.lastIndexOf('/') + 1);
      siblingsOf(entry.path).push({ id: entry.key, path: entry.path, name, type: getFileType(entry.path) });
    }
  }

  return sortNodes(root);
}
