import { DocumentTreeNode } from './document-tree-node';
import { DocumentNodeData } from './visualization';

/** Initial parse depth for schema processing */
export const INITIAL_PARSE_DEPTH = 3;
/** Initial field counts for schema processing */
export const INITIAL_FIELD_COUNTS = 100;

export interface FlattenedNode {
  treeNode: DocumentTreeNode;
  depth: number;
  index: number;
  path: string;
}

/**
 * Document tree for managing pre-parsed schema structure
 * Handles the root node and provides tree-level operations
 */
export class DocumentTree {
  public readonly documentId: string;
  public root: DocumentTreeNode;

  constructor(documentNodeData: DocumentNodeData) {
    this.documentId = documentNodeData.id;
    this.root = new DocumentTreeNode(documentNodeData);
  }

  /**
   * Find a node by path in the entire tree
   */
  findNodeByPath(path: string): DocumentTreeNode | undefined {
    return this.root.findByPath(path);
  }

  /**
   * Flattens the tree into an array of visible nodes based on expansion state
   *
   * Key behavior:
   * - Always includes the root node
   * - Only includes children if parent is expanded
   * - Recursively checks expansion state down the tree
   * - Calculates correct depth for indentation
   *
   * @param expansionState - Record mapping node paths to their expansion state
   * @param startDepth - Starting depth for the root node (default: 0)
   * @returns Array of flattened nodes with depth and index information
   */
  flatten(expansionState: Record<string, boolean>, startDepth = 0): FlattenedNode[] {
    const result: FlattenedNode[] = [];

    const traverse = (node: DocumentTreeNode, depth: number) => {
      const isRoot = node === this.root;
      const isStructured = !this.root.nodeData.isPrimitive;

      // Always add current node to result, EXCEPT for the root node when it has a schema
      if (!(isRoot && isStructured)) {
        result.push({
          treeNode: node,
          depth,
          index: result.length,
          path: node.path,
        });
      }

      // Only traverse children if:
      // 1. Node has children
      // 2. Node is expanded (checked via expansion state)
      // OR Node is the structured root node (we always show its children)
      const isExpanded = expansionState[node.path] ?? false;
      const shouldTraverse = (isRoot && isStructured) || isExpanded;

      if (node.children.length > 0 && shouldTraverse) {
        node.children.forEach((child) => {
          traverse(child, isRoot && isStructured ? depth : depth + 1);
        });
      }
    };

    traverse(this.root, startDepth);
    return result;
  }
}
