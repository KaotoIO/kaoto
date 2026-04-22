import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import { TreeParsingService } from './tree-parsing.service';

/**
 * Service to manage tree UI state and operations
 */
export class TreeUIService {
  private static readonly trees: Map<string, DocumentTree> = new Map();

  /**
   * Create a tree for a document (works for both Source and Target documents)
   * For Target documents that may change due to mapping updates, use rebuildTargetTree() instead
   */
  static createTree(documentNodeData: DocumentNodeData): DocumentTree {
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);

    this.trees.set(tree.documentId, tree);
    useDocumentTreeStore.getState().updateTreeExpansion(tree);

    return tree;
  }

  /**
   * Toggle node expansion and update store
   */
  static toggleNode(documentId: string, nodePath: string): void {
    const tree = this.trees.get(documentId);
    if (!tree) return;

    const node = tree.findNodeByPath(nodePath);
    if (!node) return;

    const store = useDocumentTreeStore.getState();

    if (!node.isParsed) {
      TreeParsingService.parseTreeNode(node);
    }

    store.toggleExpansion(documentId, nodePath);
  }

  /**
   * Invalidate a tree node and all its descendants.
   * Used when a type override or choice selection changes the field structure.
   * The node will be re-parsed on next expansion.
   *
   * @param documentId - The document ID containing the node
   * @param nodePath - The path of the node to invalidate
   */
  static invalidateNode(documentId: string, nodePath: string): void {
    const tree = this.trees.get(documentId);
    if (!tree) return;

    const node = tree.findNodeByPath(nodePath);
    if (!node) return;

    node.invalidateDescendants();
  }
}
