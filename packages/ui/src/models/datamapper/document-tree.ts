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
 * Pre-parsed tree structure for a document in the DataMapper.
 *
 * A document tree separates the document identity from its internal structure:
 * - {@link documentNodeData} represents the document itself (name, type, schema attachment)
 *   and is rendered by the panel header ({@link DocumentHeader}).
 * - {@link contentRoots} / {@link flatten} represent the document's internal structure
 *   (schema fields, mapping items) and are rendered in the panel's virtual-scroll tree.
 *
 * The internal {@link root} `DocumentTreeNode` remains the structural parent of all nodes
 * and is used by {@link TreeParsingService} for tree construction and by
 * {@link TreeUIService} for node lookup and invalidation. It is intentionally excluded
 * from {@link flatten} output to avoid duplicating the panel header in the tree.
 */
export class DocumentTree {
  readonly documentId: string;
  readonly documentNodeData: DocumentNodeData;
  readonly root: DocumentTreeNode;

  constructor(documentNodeData: DocumentNodeData) {
    this.documentNodeData = documentNodeData;
    this.documentId = documentNodeData.id;
    this.root = new DocumentTreeNode(documentNodeData);
  }

  /**
   * The first-level content nodes (schema fields for structured documents,
   * mapping items for primitive documents). These are the roots of the
   * renderable tree content.
   */
  get contentRoots(): readonly DocumentTreeNode[] {
    return this.root.children;
  }

  /** Find a node by path in the entire tree */
  findNodeByPath(path: string): DocumentTreeNode | undefined {
    return this.root.findByPath(path);
  }

  /**
   * Flattens the content tree into an array of visible nodes for virtual-scroll rendering.
   *
   * Starts from {@link contentRoots} (not the document root), since the document node
   * is represented by the panel header.
   *
   * Key behavior:
   * - Only includes children if parent is expanded
   * - Recursively checks expansion state down the tree
   * - Calculates correct depth for indentation
   *
   * @param expansionState - Record mapping node paths to their expansion state
   * @returns Array of flattened nodes with depth and index information
   */
  flatten(expansionState: Record<string, boolean>): FlattenedNode[] {
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
      if (node.children.length > 0 && (expansionState[node.path] ?? false)) {
        for (const child of node.children) {
          traverse(child, depth + 1);
        }
      }
    };

    for (const contentRoot of this.contentRoots) {
      traverse(contentRoot, 0);
    }

    return result;
  }
}
