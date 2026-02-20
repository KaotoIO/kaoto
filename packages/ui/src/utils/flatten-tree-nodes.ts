import { DocumentTreeNode } from '../models/datamapper/document-tree-node';

export interface FlattenedNode {
  treeNode: DocumentTreeNode;
  depth: number;
  index: number;
  path: string;
}

/**
 * Flattens a tree into an array of visible nodes based on expansion state
 *
 * Key behavior:
 * - Always includes the root node
 * - Only includes children if parent is expanded
 * - Recursively checks expansion state down the tree
 * - Calculates correct depth for indentation
 */
export const flattenTreeNodes = (
  rootNode: DocumentTreeNode,
  isExpanded: (path: string) => boolean,
  startDepth = 0,
): FlattenedNode[] => {
  const result: FlattenedNode[] = [];

  const traverse = (node: DocumentTreeNode, depth: number) => {
    // Always add current node to result
    result.push({
      treeNode: node,
      depth,
      index: result.length,
      path: node.path,
    });

    // Only traverse children if:
    // 1. Node has children
    // 2. Node is expanded (checked via expansion state)
    if (node.children.length > 0 && isExpanded(node.path)) {
      node.children.forEach((child) => {
        traverse(child, depth + 1);
      });
    }
  };

  traverse(rootNode, startDepth);
  return result;
};
