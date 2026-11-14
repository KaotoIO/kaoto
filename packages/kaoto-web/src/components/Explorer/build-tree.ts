import { ProjectFile } from '../../services/project-files/project-file';
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
 * Builds the Explorer tree from the flat list of project files.
 *
 * Folders are not stored; they are derived from the file paths, and their id is the folder path.
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
        siblings.push({ id: folderPath, name: segment, type: 'folder', children });
      }
      siblings = children;
    }

    siblings.push({ id: file.id, name: fileName, type: file.type });
  }

  return sortNodes(root);
}
