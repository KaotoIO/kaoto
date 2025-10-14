import { DocumentTree } from '../models/datamapper/document-tree';
import { DocumentTreeNode } from '../models/datamapper/document-tree-node';
import { processTreeNode } from '../utils';
import { VisualizationService } from './visualization.service';

/**
 * Service for parsing document schemas into tree structures with depth limits
 * for virtual scrolling performance optimization
 */
export class TreeParsingService {
  /* Parse a document tree and its children */
  static parseTree(tree: DocumentTree): void {
    processTreeNode(tree.root, (treeNode) => {
      this.parseTreeNode(treeNode);
    });
  }

  /* Parse a tree node and its children */
  static parseTreeNode(treeNode: DocumentTreeNode): void {
    const childrenNodeData = VisualizationService.generateNodeDataChildren(treeNode.nodeData);
    for (const childNodeData of childrenNodeData) {
      treeNode.addChild(childNodeData);
    }
  }
}
