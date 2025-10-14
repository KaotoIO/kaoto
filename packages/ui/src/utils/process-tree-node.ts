import { INITIAL_FIELD_COUNTS, INITIAL_PARSE_DEPTH } from '../models/datamapper/document-tree';
import { DocumentTreeNode } from '../models/datamapper/document-tree-node';

/**
 * Process on a tree node and its children up to the specified depth
 */
export const processTreeNode = (
  treeNode: DocumentTreeNode,
  fn: (treeNode: DocumentTreeNode) => void,
  options: {
    maxDepth?: number;
    maxFields?: number;
  } = {},
): void => {
  const { maxDepth = INITIAL_PARSE_DEPTH, maxFields = INITIAL_FIELD_COUNTS } = options;

  // Use a queue for breadth-first traversal
  const queue: Array<{ node: DocumentTreeNode; depth: number; count: number }> = [
    { node: treeNode, depth: 0, count: 0 },
  ];

  let totalFieldsProcessed = 0;

  while (queue.length > 0) {
    const { node, depth, count } = queue.shift()!;

    if ((depth >= maxDepth && count >= maxFields) || node.nodeData.isPrimitive) {
      continue;
    }

    fn(node);

    for (const childTreeNode of node.children) {
      const nextDepth = depth + 1;
      const nextFieldsCount = count + 1;

      totalFieldsProcessed++;

      if (nextDepth < maxDepth || totalFieldsProcessed < maxFields) {
        queue.push({
          node: childTreeNode,
          depth: nextDepth,
          count: nextFieldsCount,
        });
      }
    }
  }
};
