import { DocumentType, IField } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { MappingTree } from '../../models/datamapper/mapping';
import { TargetDocumentNodeData } from '../../models/datamapper/visualization';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import {
  createTargetTree,
  findField,
  NS_HL7_V2,
  ORM_O01,
  parseXsdDocument,
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
import { TreeUIService } from './tree-ui.service';
import { VisualizationUtilService } from './visualization-util.service';

/**
 * Selecting a target choice member in a document that already has mappings must not collapse the rows above
 * it (#4158). The selection is persisted through `updateDocument`, whose stale-mapping cleanup used to replace
 * every FieldItem and so lose the expansion of the rows below any mapped ancestor.
 *
 * The schema is a trimmed HL7 v2.5 ORM_O01, the one the issue was reported with:
 * ORM_O01 → ORM_O01.ORDER (repeating) → ORM_O01.ORDER_DETAIL → ORM_O01.ORDER_CHOICE
 *         → xs:choice (OBR | RQD | RXO) → OBR
 * Wide segments ahead of the orders put ORDER_DETAIL below the parse frontier, and the choice is not repeating,
 * so selecting OBR is a document-level selection that also creates the FieldItem chain down to OBR.
 */
describe('TreeUIService — expansion across a target choice selection (#4158)', () => {
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

  /** The rows from the document root down to ORM_O01.ORDER_CHOICE. */
  function findOrderChoiceChain() {
    const root = tree.contentRoots[0];
    const order = parseChild(root, 'ORM_O01.ORDER');
    const orderDetail = parseChild(order, 'ORM_O01.ORDER_DETAIL');
    const orderChoice = parseChild(orderDetail, 'ORM_O01.ORDER_CHOICE');
    return { root, order, orderDetail, orderChoice };
  }

  /** Steps 1–2 of the issue: expand down to the choice and pick OBR in the menu of the choice row. */
  function expandAndSelectObr() {
    const orderChoiceRow = expandChain(tree, orderChoiceTitles);
    const choiceRow = parseChildWhere(
      orderChoiceRow,
      (nodeData) => VisualizationUtilService.getField(nodeData)?.wrapperKind === 'choice',
      'for the choice',
    );
    const choiceWrapper = VisualizationUtilService.getField(choiceRow.nodeData) as IField;
    const obrIndex = choiceWrapper.fields.findIndex((member) => member.name === 'OBR');
    ChoiceFieldService.dispatchChoiceSelection(
      choiceRow.nodeData,
      choiceWrapper,
      { memberIndex: obrIndex },
      mappingTree.namespaceMap,
      true,
    );
    refreshTargetTree({ isDocumentUpdate: true });
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
});
