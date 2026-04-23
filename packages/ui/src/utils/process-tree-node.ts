import { INITIAL_FIELD_COUNTS, INITIAL_PARSE_DEPTH } from '../models/datamapper/document-tree';
import { DocumentTreeNode } from '../models/datamapper/document-tree-node';

/**
 * Process a tree node and its children up to the specified depth.
 * maxDepth is the guaranteed minimum depth, maxFields allows extending beyond it.
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

  let totalFieldsProcessed = 0;

  const visit = (node: DocumentTreeNode, depth: number): void => {
    if (depth >= maxDepth && totalFieldsProcessed >= maxFields) {
      return;
    }

    totalFieldsProcessed++;
    fn(node);

    for (const childTreeNode of node.children) {
      if (depth + 1 < maxDepth || totalFieldsProcessed < maxFields) {
        visit(childTreeNode, depth + 1);
      }
    }
  };

  visit(treeNode, 0);
};
