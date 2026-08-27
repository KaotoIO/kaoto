import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
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

    /*
     * Re-parse nodes that were previously expanded so their children exist in the new tree.
     * Without this, nodes beyond INITIAL_PARSE_DEPTH have children=[] after a rebuild and
     * flatten() will not show their children even though expansion state says true.
     */
    TreeUIService.reparseExpandedNodes(tree, newExpansion);

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

  /**
   * Re-parse any nodes in the tree that are marked as expanded in the expansion state but
   * haven't been parsed yet (i.e., nodes beyond INITIAL_PARSE_DEPTH in a freshly-built tree).
   * This ensures flatten() can traverse their children after a tree rebuild.
   */
  private static reparseExpandedNodes(tree: DocumentTree, expansionState: TreeExpansionState): void {
    const reparsePath = (node: DocumentTreeNode) => {
      if (!node.isParsed && expansionState[node.path]) {
        TreeParsingService.parseTreeNode(node);
      }
      for (const child of node.children) {
        reparsePath(child);
      }
    };
    for (const contentRoot of tree.contentRoots) {
      reparsePath(contentRoot);
    }
  }

  private static reconcileExpansion(
    documentNodeDataId: string,
    newTree: DocumentTree,
    fieldExpansion?: Record<string, boolean>,
  ): TreeExpansionState {
    const currentExpansionState = useDocumentTreeStore.getState().expansionState[documentNodeDataId] ?? {};

    /*
     * Start with a full copy of the old expansion state so that entries for nodes beyond the
     * initial parse depth (which don't exist in the new tree yet) are preserved as-is.
     * The node walk below will then override only the entries for nodes that do exist in the
     * new tree, applying field-identity reconciliation where needed.
     */
    const newExpansionState: TreeExpansionState = { ...currentExpansionState };

    for (const contentRoot of newTree.contentRoots) {
      processTreeNode(
        contentRoot,
        (treeNode) => {
          const isNodeParsed = treeNode.isParsed;
          let savedState = currentExpansionState[treeNode.path];
          if (savedState === undefined && fieldExpansion && 'field' in treeNode.nodeData) {
            savedState = fieldExpansion[(treeNode.nodeData as { field: { id: string } }).field.id];
          }
          /*
           * Preserve any explicitly saved state. Only use isNodeParsed as a default for
           * nodes that have never been visited before (no entry in the previous expansion state).
           */
          newExpansionState[treeNode.path] = savedState !== undefined ? savedState : isNodeParsed;
        },
        { maxDepth: Infinity, maxFields: Infinity },
      );
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
      processTreeNode(
        contentRoot,
        (treeNode) => {
          if ('field' in treeNode.nodeData) {
            const fieldId = (treeNode.nodeData as { field: { id: string } }).field.id;
            const state = currentExpansionState[treeNode.path];
            if (state !== undefined && !(fieldId in fieldExpansion)) {
              fieldExpansion[fieldId] = state;
            }
          }
        },
        { maxDepth: Infinity, maxFields: Infinity },
      );
    }
    return Object.keys(fieldExpansion).length > 0 ? fieldExpansion : undefined;
  }
}
