import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { IfItem, MappingItem, MappingTree } from '../../models/datamapper/mapping';
import { IMappingLink, TargetDocumentNodeData, TargetRenderIndex } from '../../models/datamapper/visualization';
import { TargetRenderService } from '../../services/visualization/target-render.service';
import { TreeParsingService } from '../../services/visualization/tree-parsing.service';

/**
 * Asserts that `links` is not empty and that every link ends on a row of the target tree built from
 * `targetNodeData`, parsing collapsed subtrees along the way. A line whose target has no row is drawn
 * to the panel edge instead, which is the symptom of the tree and the lines disagreeing.
 * @param links - the mapping links to check
 * @param targetNodeData - the target document node the rendered tree is built from
 */
export const expectLinksOnRenderedRows = (links: IMappingLink[], targetNodeData: TargetDocumentNodeData): void => {
  expect(links.length).toBeGreaterThan(0);
  const tree = new DocumentTree(targetNodeData);
  for (const link of links) {
    expect(findRow(tree.root, link.targetNodePath)?.path).toEqual(link.targetNodePath);
  }
};

/**
 * Asserts that every see-through decision under `root` still matches `renderIndex`, i.e. that the
 * action under test didn't change a decision without asking for a structural refresh.
 * @param root - the mapping tree, or the part of it the action could have affected
 * @param renderIndex - the render index of the snapshot that is on screen
 */
export const expectNoDecisionChange = (root: MappingTree | MappingItem, renderIndex: TargetRenderIndex): void => {
  for (const ifItem of collectIfItems(root)) {
    const isSeeThrough = !!TargetRenderService.computeSeeThroughField(ifItem, renderIndex.sourceContext);
    expect(isSeeThrough).toBe(renderIndex.isAbsorbed(ifItem));
  }
};

const findRow = (root: DocumentTreeNode, path: string): DocumentTreeNode | undefined => {
  let node: DocumentTreeNode | undefined = root;
  while (node && node.path !== path) {
    if (!node.isParsed) TreeParsingService.parseTreeNode(node);
    node = node.children.find((child) => child.path === path || path.startsWith(`${child.path}/`));
  }
  return node;
};

const collectIfItems = (item: MappingTree | MappingItem): IfItem[] => {
  const ifItems: IfItem[] = item instanceof IfItem ? [item] : [];
  for (const child of item.children) {
    ifItems.push(...collectIfItems(child));
  }
  return ifItems;
};
