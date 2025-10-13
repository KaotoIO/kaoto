import { DocumentTree, INITIAL_PARSE_DEPTH } from '../models/datamapper/document-tree';
import { DocumentNodeData } from '../models/datamapper/visualization';
import { useDocumentTreeStore } from '../store/document-tree.store';
import { TreeParsingService } from './tree-parsing.service';

/**
 * Service to manage tree UI state and operations
 */
export class TreeUIService {
  private static readonly trees: Map<string, DocumentTree> = new Map();

  /**
   * Create a tree for a document
   */
  static createTree(documentNodeData: DocumentNodeData): DocumentTree {
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTreeToDepth(tree, INITIAL_PARSE_DEPTH);
    const initialExpandedState = TreeParsingService.getExpandTreeToDepth(tree, INITIAL_PARSE_DEPTH);

    const documentId = documentNodeData.id;
    this.trees.set(documentId, tree);
    useDocumentTreeStore.getState().setTreeExpansion(documentId, initialExpandedState);

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
}
