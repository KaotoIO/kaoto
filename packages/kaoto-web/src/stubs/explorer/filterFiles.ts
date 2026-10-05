import { ExplorerFile } from './index';

/**
 * Recursively filter a file tree by a lowercase query string.
 * A folder is included if its name matches OR any of its children match.
 * Children are recursively filtered so deeply nested matches are preserved.
 */
export function filterFiles(files: ExplorerFile[], query: string): ExplorerFile[] {
  if (!query) return files;
  return files.reduce<ExplorerFile[]>((acc, node) => {
    const nameMatches = node.name.toLowerCase().includes(query);
    if (node.children) {
      const filteredChildren = filterFiles(node.children, query);
      if (nameMatches || filteredChildren.length > 0) {
        acc.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children });
      }
    } else if (nameMatches) {
      acc.push(node);
    }
    return acc;
  }, []);
}
