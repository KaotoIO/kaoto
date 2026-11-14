import { ProjectFile } from '../../services/project-files/project-file';
import { ExplorerFile } from './explorer-file';

const FOLDER_ID_PREFIX = 'folder:';

/**
 * The id of the folder node for a folder path.
 *
 * The prefix keeps folder ids apart from file ids, which only hold `[a-zA-Z0-9_-]`: a file `integrations` in the
 * folder `integrations` must not share its id with the folder.
 */
export const toFolderId = (folderPath: string): string => `${FOLDER_ID_PREFIX}${folderPath}`;

/** The folder path of a folder node id */
export const toFolderPath = (folderId: string): string => folderId.slice(FOLDER_ID_PREFIX.length);

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
 * Builds the Explorer tree from the flat list of project files.
 *
 * Folders are not stored; they are derived from the file paths, and their id is built with `toFolderId`.
 * Folders come before files, each in natural order by name.
 */
export function buildTree(files: Pick<ProjectFile, 'id' | 'path' | 'type'>[]): ExplorerFile[] {
  const root: ExplorerFile[] = [];
  const folderChildren = new Map<string, ExplorerFile[]>();

  for (const file of files) {
    const segments = file.path.split('/');
    const fileName = segments[segments.length - 1];

    let siblings = root;
    let folderPath = '';
    for (const segment of segments.slice(0, -1)) {
      folderPath = folderPath ? `${folderPath}/${segment}` : segment;
      let children = folderChildren.get(folderPath);
      if (!children) {
        children = [];
        folderChildren.set(folderPath, children);
        siblings.push({ id: toFolderId(folderPath), name: segment, type: 'folder', children });
      }
      siblings = children;
    }

    siblings.push({ id: file.id, name: fileName, type: file.type });
  }

  return sortNodes(root);
}
