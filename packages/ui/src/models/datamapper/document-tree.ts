import { DocumentTreeNode } from './document-tree-node';
import { DocumentNodeData } from './visualization';

/** Initial parse depth for schema processing */
export const INITIAL_PARSE_DEPTH = 3;
/** Initial field counts for schema processing */
export const INITIAL_FIELD_COUNTS = 100;

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
}
