import { DocumentNodeData, NodeData } from './visualization';

/** Initial parse depth for schema processing */
export const INITIAL_PARSE_DEPTH = 3;

/**
 * Document tree for managing pre-parsed schema structure
 * Handles the root node and provides tree-level operations
 */
export class DocumentTree {
  public root: DocumentTreeNode;

  constructor(documentNodeData: DocumentNodeData) {
    this.root = new DocumentTreeNode(documentNodeData);
  }

  /**
   * Find a node by path in the entire tree
   */
  findNodeByPath(path: string): DocumentTreeNode | undefined {
    return this.root.findByPath(path);
  }
}

/**
 * Tree node for DataMapper virtual scrolling implementation
 * Represents a single node in the pre-parsed document tree
 */
export class DocumentTreeNode {
  public path: string;
  public isParsed = false;
  public children: DocumentTreeNode[] = [];

  constructor(
    public nodeData: NodeData,
    public parent?: DocumentTreeNode,
  ) {
    this.parent = parent;
    this.path = nodeData.path.toString();
  }

  /**
   * Add a child node to this tree node
   */
  addChild(childNodeData: NodeData): DocumentTreeNode {
    const childNode = new DocumentTreeNode(childNodeData, this);
    this.children.push(childNode);
    this.isParsed = true;
    return childNode;
  }

  /**
   * Return the node's children
   */
  getChildren(): DocumentTreeNode[] {
    return this.children;
  }

  /**
   * Find a node by path in the subtree
   */
  findByPath(path: string): DocumentTreeNode | undefined {
    if (this.path === path) {
      return this;
    }

    for (const child of this.children) {
      const found = child.findByPath(path);
      if (found) {
        return found;
      }
    }

    return undefined;
  }
}
