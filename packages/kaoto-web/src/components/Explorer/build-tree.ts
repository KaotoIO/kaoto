import { ProjectFile } from '../../services/project-files/project-file';
import { ExplorerFile } from './explorer-file';

const byName = (a: ExplorerFile, b: ExplorerFile) => {
  if (a.name === b.name) return 0;
  return a.name < b.name ? -1 : 1;
};

const sortNodes = (nodes: ExplorerFile[]): ExplorerFile[] => {
  const folders = nodes.filter((node) => node.children).sort(byName);
  const files = nodes.filter((node) => !node.children).sort(byName);
  folders.forEach((folder) => {
    folder.children = sortNodes(folder.children ?? []);
  });
  return [...folders, ...files];
};

/**
 * Builds the Explorer tree from the flat list of project files.
 *
 * Folders are not stored; they are derived from the file paths, and their id is the folder path.
 * Folders come before files, each sorted by name.
 */
export function buildTree(files: Pick<ProjectFile, 'id' | 'path' | 'type'>[]): ExplorerFile[] {
  const root: ExplorerFile[] = [];
  const folders = new Map<string, ExplorerFile>();

  for (const file of files) {
    const segments = file.path.split('/');
    const fileName = segments.pop() ?? file.path;

    let siblings = root;
    let folderPath = '';
    for (const segment of segments) {
      folderPath = folderPath ? `${folderPath}/${segment}` : segment;
      let folder = folders.get(folderPath);
      if (!folder) {
        folder = { id: folderPath, name: segment, type: 'folder', children: [] };
        folders.set(folderPath, folder);
        siblings.push(folder);
      }
      siblings = folder.children ?? [];
    }

    siblings.push({ id: file.id, name: fileName, type: file.type });
  }

  return sortNodes(root);
}
