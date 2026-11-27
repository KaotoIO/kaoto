import { IDocument } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { MappingTree } from '../../models/datamapper/mapping';
import { NodeData } from '../../models/datamapper/visualization';
import { MappingService } from '../../services/mapping/mapping.service';
import { TreeParsingService } from '../../services/visualization/tree-parsing.service';
import { TreeUIService } from '../../services/visualization/tree-ui.service';
import { useDocumentTreeStore } from '../../store/document-tree.store';

/**
 * Forgets every tree `TreeUIService` built, with the FieldItem snapshots its next build diffs against, and the
 * expansion state, so a test starts from a first build.
 */
export const resetDocumentTrees = (): void => {
  TreeUIService.clear();
  useDocumentTreeStore.setState({ expansionState: {}, expansionStateArray: {} });
};

/**
 * The child row of `node` that `matches` picks, parsing `node` first when it has not been; fails the test when
 * there is none.
 * @param node - the row to look under
 * @param matches - picks the child row
 * @param label - names the row in the failure message
 */
export const parseChildWhere = (
  node: DocumentTreeNode,
  matches: (nodeData: NodeData) => boolean,
  label: string,
): DocumentTreeNode => {
  if (!node.isParsed) TreeParsingService.parseTreeNode(node);
  const child = node.children.find((candidate) => matches(candidate.nodeData));
  if (!child) throw new Error(`No row ${label} under ${node.path}`);
  return child;
};

/**
 * The child row titled `title` of `node`, parsing `node` first when it has not been.
 * @param node - the row to look under
 * @param title - the row title
 */
export const parseChild = (node: DocumentTreeNode, title: string): DocumentTreeNode =>
  parseChildWhere(node, (nodeData) => nodeData.title === title, `titled '${title}'`);

/**
 * Expands the rows titled `titles`, each under the previous one, starting below the first content root, as
 * clicking their chevrons does.
 * @param tree - the tree to expand in
 * @param titles - the titles of the rows to expand, from the top down
 * @returns the last row expanded
 */
export const expandChain = (tree: DocumentTree, titles: string[]): DocumentTreeNode => {
  const documentId = tree.documentNodeId;
  let chainRow = tree.contentRoots[0];
  for (const title of titles) {
    chainRow = parseChild(chainRow, title);
    if (!useDocumentTreeStore.getState().isExpanded(documentId, chainRow.path)) {
      TreeUIService.toggleNode(documentId, chainRow.path);
    }
  }
  return chainRow;
};

/**
 * Hands the items of `mappingTree` to a new MappingTree, as a structural refresh of the DataMapper provider does:
 * the children, the global variables, the namespace map and the target document carry over, and the definition
 * type stays. With `isDocumentUpdate`, it first runs the stale-mapping cleanup that `updateDocument` runs before
 * that refresh.
 * @param mappingTree - the current mapping tree
 * @param targetDocument - the target document the mapping tree maps
 * @returns the new mapping tree, holding the same items
 */
export const refreshTargetMappingTree = (
  mappingTree: MappingTree,
  targetDocument: IDocument,
  { isDocumentUpdate = false } = {},
): MappingTree => {
  if (isDocumentUpdate) MappingService.removeStaleMappingsForDocument(mappingTree, targetDocument);
  const refreshed = new MappingTree(
    targetDocument.documentType,
    targetDocument.documentId,
    mappingTree.documentDefinitionType,
  );
  refreshed.children = mappingTree.children.map((child) => {
    child.parent = refreshed;
    return child;
  });
  refreshed.globalVariables = mappingTree.globalVariables.map((variable) => {
    variable.parent = refreshed;
    return variable;
  });
  refreshed.namespaceMap = mappingTree.namespaceMap;
  refreshed.targetDocument = targetDocument;
  return refreshed;
};
