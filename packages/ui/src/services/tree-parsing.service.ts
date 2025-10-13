import { DocumentTree } from '../models/datamapper/document-tree';
import { DocumentTreeNode } from '../models/datamapper/document-tree-node';
import { DocumentNodeData, FieldNodeData, NodeData } from '../models/datamapper/visualization';
import { DocumentUtilService } from './document-util.service';
import { DocumentService } from './document.service';
import { VisualizationService } from './visualization.service';

/**
 * Service for parsing document schemas into tree structures with depth limits
 * for virtual scrolling performance optimization
 */
export class TreeParsingService {
  /**
   * Parse a tree node and its children up to the specified depth
   */
  static parseTreeToDepth(tree: DocumentTree, maxDepth: number): void {
    this.processTreeNodeToDepth(
      tree.root,
      (treeNode) => {
        this.parseTreeNode(treeNode);
      },
      { maxDepth },
    );
  }

  static parseTreeNode(treeNode: DocumentTreeNode): void {
    const childrenNodeData = VisualizationService.generateNodeDataChildren(treeNode.nodeData);
    for (const childNodeData of childrenNodeData) {
      treeNode.addChild(childNodeData);
    }
  }

  /**
   * Return the expansion map from tree node and its children up to the specified depth
   */
  static getExpandTreeToDepth(tree: DocumentTree, maxDepth: number): { [nodePath: string]: boolean } {
    const state: { [nodePath: string]: boolean } = {};

    this.processTreeNodeToDepth(
      tree.root,
      (treeNode) => {
        state[treeNode.path] = true;
      },
      { maxDepth },
    );

    return state;
  }

  /**
   * Check if a node can potentially have children
   * This is used to determine if expansion controls should be shown
   */
  static canNodeHaveChildren(nodeData: NodeData): boolean {
    if (nodeData.isPrimitive) {
      return false;
    }

    /* Document nodes can have children if they have fields */
    if (nodeData instanceof DocumentNodeData) {
      return DocumentService.hasFields(nodeData.document);
    }

    /* Field nodes can have children if they have nested fields */
    if (nodeData instanceof FieldNodeData) {
      /* Resolve type fragments to check for actual children */
      DocumentUtilService.resolveTypeFragment(nodeData.field);
      return DocumentService.hasChildren(nodeData.field);
    }

    /* For other node types, use the existing visualization service logic */
    return VisualizationService.hasChildren(nodeData);
  }

  /**
   * Process on a tree node and its children up to the specified depth
   */
  private static processTreeNodeToDepth(
    treeNode: DocumentTreeNode,
    fn: (treeNode: DocumentTreeNode) => void,
    options: {
      maxDepth?: number;
      currentDepth?: number;
    } = {},
  ): void {
    const { maxDepth = 1, currentDepth = 0 } = options;
    if (currentDepth >= maxDepth || treeNode.nodeData.isPrimitive) {
      return;
    }

    fn(treeNode);

    for (const childTreeNode of treeNode.children) {
      const nextDepth = currentDepth + 1;
      if (nextDepth < maxDepth) {
        this.processTreeNodeToDepth(childTreeNode, fn, { maxDepth, currentDepth: nextDepth });
      }
    }
  }
}
