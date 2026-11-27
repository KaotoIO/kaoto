import { DocumentType } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { MappingTree, ValueOfSelector } from '../../models/datamapper/mapping';
import { MappingActionKind } from '../../models/datamapper/mapping-action';
import {
  FieldItemNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import {
  createTargetTree,
  findField,
  NS_HL7_V2,
  ORM_O01,
  parseXsdDocument,
  selectChoiceMember,
} from '../../stubs/datamapper/cardinality-test-helpers';
import { getHl7OrmOrderChoiceXsd } from '../../stubs/datamapper/data-mapper';
import {
  expandChain,
  parseChild,
  parseChildWhere,
  refreshTargetMappingTree,
  resetDocumentTrees,
} from '../../stubs/datamapper/document-tree-test-helpers';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { MappingService } from '../mapping/mapping.service';
import { ChoiceFieldService } from './choice-field.service';
import { MappingActionService } from './mapping-action.service';
import { MappingActionRegistryService } from './mapping-action-registry.service';
import { TreeUIService } from './tree-ui.service';
import { VisualizationService } from './visualization.service';
import { VisualizationUtilService } from './visualization-util.service';

/**
 * Selecting a target choice member in a document that already has mappings, and mapping under it (#4158).
 * Selecting must not collapse the rows above the member: the selection is persisted through `updateDocument`,
 * whose stale-mapping cleanup used to replace every FieldItem and so lose the expansion of the rows below any
 * mapped ancestor. The last test walks through the whole scenario of the issue.
 *
 * The schema is a trimmed HL7 v2.5 ORM_O01, the one the issue was reported with:
 * ORM_O01 → ORM_O01.ORDER (repeating) → ORM_O01.ORDER_DETAIL → ORM_O01.ORDER_CHOICE
 *         → xs:choice (OBR | RQD | RXO) → OBR
 * Wide segments ahead of the orders put ORDER_DETAIL below the parse frontier, and the choice is not repeating,
 * so selecting OBR is a document-level selection that also creates the FieldItem chain down to OBR.
 */
describe('TreeUIService — target choice selection in a document with mappings (#4158)', () => {
  const orderChoiceTitles = ['ORM_O01.ORDER', 'ORM_O01.ORDER_DETAIL', 'ORM_O01.ORDER_CHOICE'];

  let targetDoc: XmlSchemaDocument;
  let mappingTree: MappingTree;
  let tree: DocumentTree;

  function buildTargetTree() {
    tree = TreeUIService.createTree(new TargetDocumentNodeData(targetDoc, mappingTree));
  }

  function refreshTargetTree({ isDocumentUpdate = false } = {}) {
    mappingTree = refreshTargetMappingTree(mappingTree, targetDoc, { isDocumentUpdate });
    buildTargetTree();
  }

  function isExpanded(row: DocumentTreeNode): boolean {
    return useDocumentTreeStore.getState().isExpanded(tree.documentNodeId, row.path);
  }

  /** Expands `row`, as clicking its chevron does. */
  function expand(row: DocumentTreeNode) {
    if (!isExpanded(row)) TreeUIService.toggleNode(tree.documentNodeId, row.path);
  }

  /** The rows from the document root down to ORM_O01.ORDER_CHOICE. */
  function findOrderChoiceChain() {
    const root = tree.contentRoots[0];
    const order = parseChild(root, 'ORM_O01.ORDER');
    const orderDetail = parseChild(order, 'ORM_O01.ORDER_DETAIL');
    const orderChoice = parseChild(orderDetail, 'ORM_O01.ORDER_CHOICE');
    return { root, order, orderDetail, orderChoice };
  }

  function findObrRow() {
    return parseChild(findOrderChoiceChain().orderChoice, 'OBR');
  }

  /** OBR is still drawn as the selected member, with its children, and it and the rows above it stay expanded. */
  function expectObrSelectedWithChildren() {
    const { root, order, orderDetail, orderChoice } = findOrderChoiceChain();
    const obrRow = findObrRow();
    expect([root, order, orderDetail, orderChoice, obrRow].map(isExpanded)).toEqual([true, true, true, true, true]);
    expect(obrRow.nodeData).toBeInstanceOf(TargetChoiceFieldNodeData);
    expect((obrRow.nodeData as TargetChoiceFieldNodeData).choiceField).toBeDefined();
    expect(VisualizationService.hasChildren(obrRow.nodeData)).toBe(true);
    expect(parseChild(obrRow, 'OBR.3')).toBeDefined();
  }

  /** Steps 1–2 of the issue: expand down to the choice and pick OBR in the menu of the choice row. */
  function expandAndSelectObr() {
    const orderChoiceRow = expandChain(tree, orderChoiceTitles);
    const choiceRow = parseChildWhere(
      orderChoiceRow,
      (nodeData) => VisualizationUtilService.getField(nodeData)?.wrapperKind === 'choice',
      'for the choice',
    );
    selectChoiceMember(choiceRow.nodeData, 'OBR', mappingTree.namespaceMap);
    refreshTargetTree({ isDocumentUpdate: true });
    expand(findObrRow());
  }

  /**
   * The document in the issue already maps PID (the recording shows its connection port), so the root ORM_O01 row
   * is a FieldItem before OBR is selected. Without it no FieldItem exists to be replaced, and nothing collapses.
   */
  function mapPidSegment() {
    const rootItem = MappingService.createFieldItem(mappingTree, findField(targetDoc, 'ORM_O01'));
    const patientItem = MappingService.createFieldItem(rootItem, findField(targetDoc, 'ORM_O01.PATIENT'));
    const pidItem = MappingService.createFieldItem(patientItem, findField(targetDoc, 'PID'));
    pidItem.children.push(MappingService.createValueOfSelector(pidItem));
  }

  beforeEach(() => {
    resetDocumentTrees();
    targetDoc = parseXsdDocument(DocumentType.TARGET_BODY, 'Hl7OrmOrderChoice.xsd', getHl7OrmOrderChoiceXsd(), ORM_O01);
    mappingTree = createTargetTree(targetDoc, { hl7: NS_HL7_V2 });
    mapPidSegment();
    buildTargetTree();
  });

  afterEach(() => {
    resetDocumentTrees();
  });

  it('should leave ORDER_DETAIL unparsed on a fresh build, as in the real HL7 schema', () => {
    // The segments ahead of the orders use up INITIAL_FIELD_COUNTS, so ORDER_DETAIL sits below the parse
    // frontier. Only there does a lost expansion key show: a parsed row without a key is expanded by default.
    const order = tree.contentRoots[0].children.find((row) => row.nodeData.title === 'ORM_O01.ORDER');
    const orderDetail = order?.children.find((row) => row.nodeData.title === 'ORM_O01.ORDER_DETAIL');
    expect(orderDetail).toBeDefined();
    expect(orderDetail?.isParsed).toBe(false);
  });

  it('should keep ORDER, ORDER_DETAIL and ORDER_CHOICE expanded after selecting OBR', () => {
    expandAndSelectObr();

    const { root, order, orderDetail, orderChoice } = findOrderChoiceChain();
    expect([root, order, orderDetail, orderChoice].map(isExpanded)).toEqual([true, true, true, true]);
  });

  it('should keep the expansion, the row kinds and the selection through the whole scenario of the issue', () => {
    // 1–3. Select OBR: nothing above it collapses.
    expandAndSelectObr();
    const { root, order, orderDetail, orderChoice } = findOrderChoiceChain();
    expect([root, order, orderDetail, orderChoice].map(isExpanded)).toEqual([true, true, true, true]);

    // 4–7. "Add value selector" on a child of OBR: it is an ordinary element, not a choice member. The issue used
    // OBR.4, a composite; the menu no longer offers a value selector on a field with element children, so the
    // scenario maps the plain OBR.3.
    const obr3RowBefore = parseChild(findObrRow(), 'OBR.3');
    expect(MappingActionRegistryService.getAllowedActions(obr3RowBefore.nodeData as TargetNodeData)).toContain(
      MappingActionKind.ValueSelector,
    );
    MappingActionService.applyValueOfSelector(obr3RowBefore.nodeData as TargetNodeData);
    refreshTargetTree();
    const obr3Row = parseChild(findObrRow(), 'OBR.3');
    expect(obr3Row.nodeData).toBeInstanceOf(FieldItemNodeData);
    expect(VisualizationUtilService.isChoiceWrapperMember(obr3Row.nodeData)).toBe(false);
    expect(ChoiceFieldService.resolveInfo(obr3Row.nodeData).effectiveChoiceWrapper).toBeUndefined();

    // 8–10. Delete the empty value-of, drawn inline on the OBR.3 row: OBR stays selected, with its children and
    // its expand button, and nothing above it collapses.
    const obr3Item = (obr3Row.nodeData as FieldItemNodeData).mapping;
    expect(obr3Item.children.some((child) => child instanceof ValueOfSelector)).toBe(true);
    MappingActionService.deleteMappingItem(obr3Row.nodeData as TargetNodeData);
    refreshTargetTree();

    expectObrSelectedWithChildren();

    // Mapping OBR.3 again creates the FieldItems under the selection that stayed: nothing collapses either.
    MappingActionService.applyValueOfSelector(parseChild(findObrRow(), 'OBR.3').nodeData as TargetNodeData);
    refreshTargetTree();

    expectObrSelectedWithChildren();
    expect(parseChild(findObrRow(), 'OBR.3').nodeData).toBeInstanceOf(FieldItemNodeData);
  });

  it('should keep the expansion and the selection when the mapping of a nested leaf under OBR is deleted', () => {
    expandAndSelectObr();

    // OBR.4 is a composite, so mapping CE.1 puts an OBR.4 FieldItem the user did not create between the mapping
    // and OBR, and the delete cleans up more than one level.
    const ce1RowBefore = parseChild(parseChild(findObrRow(), 'OBR.4'), 'CE.1');
    expect(MappingActionRegistryService.getAllowedActions(ce1RowBefore.nodeData as TargetNodeData)).toContain(
      MappingActionKind.ValueSelector,
    );
    MappingActionService.applyValueOfSelector(ce1RowBefore.nodeData as TargetNodeData);
    refreshTargetTree();
    const obr4Row = parseChild(findObrRow(), 'OBR.4');
    expect(obr4Row.nodeData).toBeInstanceOf(FieldItemNodeData);
    expect(VisualizationUtilService.isChoiceWrapperMember(obr4Row.nodeData)).toBe(false);
    expand(obr4Row);

    MappingActionService.deleteMappingItem(parseChild(obr4Row, 'CE.1').nodeData as TargetNodeData);
    refreshTargetTree();

    expectObrSelectedWithChildren();
    expect(isExpanded(parseChild(findObrRow(), 'OBR.4'))).toBe(true);
  });
});
