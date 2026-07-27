import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { TreeExpansionState, useDocumentTreeStore } from '../../store/document-tree.store';
import { processTreeNode } from '../../utils';
import { TreeParsingService } from './tree-parsing.service';

/**
 * Manages tree UI state: creation, expansion toggling, and node invalidation.
 *
 * Owns domain-specific logic for expansion state reconciliation across tree rebuilds.
 * The store ({@link useDocumentTreeStore}) is a pure data layer — it provides path-based
 * reconciliation via `updateTreeExpansion` and a direct setter via `setTreeExpansion`,
 * but has no knowledge of field identity or node type transitions.
 *
 * **Future direction:** The current architecture rebuilds the entire tree whenever
 * mappings change, then reconciles expansion state with a field-identity fallback.
 * A per-node expansion update approach — updating individual node paths when a mapping
 * is created or removed — would eliminate both the full-tree rebuild and the
 * field-identity reconciliation map.
 */
export class TreeUIService {
  private static readonly trees: Map<string, DocumentTree> = new Map();

  /**
   * Create and register a tree for a document node.
   *
   * When a tree already exists for the same document ID (i.e., a rebuild), expansion
   * state is reconciled using both path matching and a field-identity fallback.
   * The fallback handles the TargetFieldNodeData / FieldItemNodeData transition where
   * the node's path segment changes (field.id vs mapping.id) but the underlying IField
   * remains the same.
   *
   * This reconciliation is temporary scaffolding — once expansion state can be updated
   * per-node when a mapping is created or removed, full-tree reconciliation and the
   * field-identity map will no longer be necessary.
   */
  static createTree(documentNodeData: DocumentNodeData): DocumentTree {
    const fieldExpansion = TreeUIService.buildFieldExpansionMap(documentNodeData.id);

    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);

    this.trees.set(tree.documentNodeDataId, tree);

    const newExpansion = TreeUIService.reconcileExpansion(documentNodeData.id, tree, fieldExpansion);
    useDocumentTreeStore.getState().setTreeExpansion(tree.documentNodeDataId, newExpansion);

    return tree;
  }

  static getTree(documentNodeDataId: string): DocumentTree | undefined {
    return this.trees.get(documentNodeDataId);
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

  private static reconcileExpansion(
    documentNodeDataId: string,
    newTree: DocumentTree,
    fieldExpansion?: Record<string, boolean>,
  ): TreeExpansionState {
    const currentExpansionState = useDocumentTreeStore.getState().expansionState[documentNodeDataId] ?? {};
    const newExpansionState: TreeExpansionState = {};

    for (const contentRoot of newTree.contentRoots) {
      processTreeNode(contentRoot, (treeNode) => {
        const isNodeParsed = treeNode.isParsed;
        let savedState = currentExpansionState[treeNode.path];
        if (savedState === undefined && fieldExpansion && 'field' in treeNode.nodeData) {
          savedState = fieldExpansion[(treeNode.nodeData as { field: { id: string } }).field.id];
        }
        newExpansionState[treeNode.path] = isNodeParsed && (savedState ?? true);
      });
    }

    return newExpansionState;
  }

  private static buildFieldExpansionMap(documentNodeDataId: string): Record<string, boolean> | undefined {
    const oldTree = this.trees.get(documentNodeDataId);
    if (!oldTree) return undefined;

    const currentExpansionState = useDocumentTreeStore.getState().expansionState[documentNodeDataId];
    if (!currentExpansionState) return undefined;

    const fieldExpansion: Record<string, boolean> = {};
    for (const contentRoot of oldTree.contentRoots) {
      processTreeNode(contentRoot, (treeNode) => {
        if ('field' in treeNode.nodeData) {
          const fieldId = (treeNode.nodeData as { field: { id: string } }).field.id;
          const state = currentExpansionState[treeNode.path];
          if (state !== undefined && !(fieldId in fieldExpansion)) {
            fieldExpansion[fieldId] = state;
          }
        }
      });
    }
    return Object.keys(fieldExpansion).length > 0 ? fieldExpansion : undefined;
  }
}
