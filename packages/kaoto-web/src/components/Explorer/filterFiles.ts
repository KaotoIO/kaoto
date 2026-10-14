import { ExplorerFile } from '../../stubs/explorer/index';

/**
 * Find the path (ancestor chain) from root to the node with the given id.
 * Returns an array of nodes from root to the target, or null if not found.
 */
export function findPath(files: ExplorerFile[], targetId: string): ExplorerFile[] | null {
  for (const node of files) {
    if (node.id === targetId) return [node];
    if (node.children) {
      const childPath = findPath(node.children, targetId);
      if (childPath) return [node, ...childPath];
    }
  }
  return null;
}

/**
 * Recursively filter a file tree by a lowercase query string.
 *
 * Rules:
 *  - A leaf node is included when its name matches the query.
 *  - A folder is included when its name matches OR at least one descendant matches.
 *  - When a folder name matches, it is shown with ALL its original children so the
 *    user can browse the folder contents after finding it by name.
 *  - When only children match (folder name does not), only the matching subtree is
 *    kept so the tree stays focused on the search results.
 */
export function filterFiles(files: ExplorerFile[], query: string): ExplorerFile[] {
  if (!query) return files;
  return files.reduce<ExplorerFile[]>((acc, node) => {
    const nameMatches = node.name.toLowerCase().includes(query);
    if (node.children) {
      if (nameMatches) {
        // Folder name matched — show it with all original children.
        acc.push(node);
      } else {
        const filteredChildren = filterFiles(node.children, query);
        if (filteredChildren.length > 0) {
          // Only children matched — show folder with the matching subtree only.
          acc.push({ ...node, children: filteredChildren });
        }
      }
    } else if (nameMatches) {
      acc.push(node);
    }
    return acc;
  }, []);
}
