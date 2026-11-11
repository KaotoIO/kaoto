import {
  BODY_DOCUMENT_ID,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
} from '../../models/datamapper/document';
import { DocumentTree, FlattenedNode } from '../../models/datamapper/document-tree';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import {
  CopyOfSelector,
  FieldItem,
  IfItem,
  MappingItem,
  MappingParentType,
  MappingTree,
} from '../../models/datamapper/mapping';
import {
  FieldItemNodeData,
  ISourceDocumentContext,
  MappingNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../../models/datamapper/visualization';
import { MappingService } from '../../services/mapping/mapping.service';
import { MappingActionService } from '../../services/visualization/mapping-action.service';
import { TargetRenderService } from '../../services/visualization/target-render.service';
import { TreeParsingService } from '../../services/visualization/tree-parsing.service';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { getTargetRowKeys } from './target-row-keys';

const SHIP_ORDER_NS = 'io.kaoto.datamapper.poc.test';
const BODY_NOTE = '/ns0:ShipOrder/Item/Note';

const findField = (parent: IDocument | IField, name: string): IField => {
  const field = parent.fields.find((child) => child.name === name);
  if (!field) throw new Error(`No field named '${name}'`);
  return field;
};

const mapField = (parent: MappingParentType, field: IField, expression: string) => {
  const fieldItem = MappingService.createFieldItem(parent, field);
  const selector = MappingService.createValueOfSelector(fieldItem);
  selector.expression = expression;
  fieldItem.children.push(selector);
  return { fieldItem, selector };
};

const addGuard = (parent: MappingParentType, field: IField, test: string, expression = test) => {
  const guard = new IfItem(parent);
  guard.expression = test;
  parent.children.push(guard);
  return { guard, ...mapField(guard, field, expression) };
};

const expandAll = (node: DocumentTreeNode, expansionState: Record<string, boolean>): void => {
  expansionState[node.path] = true;
  for (const child of node.children) {
    expandAll(child, expansionState);
  }
};

const findRowIndex = (rows: FlattenedNode[], item: MappingItem): number => {
  const index = rows.findIndex(
    ({ treeNode }) => treeNode.nodeData instanceof MappingNodeData && treeNode.nodeData.mapping === item,
  );
  if (index < 0) throw new Error(`No row shows '${item.id}'`);
  return index;
};

const findFieldItemRow = (rows: FlattenedNode[], fieldItem: FieldItem): FieldItemNodeData => {
  for (const { treeNode } of rows) {
    if (treeNode.nodeData instanceof FieldItemNodeData && treeNode.nodeData.mapping === fieldItem) {
      return treeNode.nodeData;
    }
  }
  throw new Error(`No row shows '${fieldItem.field.name}'`);
};

const getRowKey = (rows: FlattenedNode[], item: MappingItem): string =>
  getTargetRowKeys(rows)[findRowIndex(rows, item)];

describe('getTargetRowKeys()', () => {
  let targetDoc: IDocument;
  let sourceContext: ISourceDocumentContext;
  let mappingTree: MappingTree;
  let shipOrderItem: FieldItem;
  let itemItem: FieldItem;
  let noteField: IField;

  const flattenTargetTree = (): FlattenedNode[] => {
    const renderIndex = TargetRenderService.buildIndex(mappingTree, sourceContext);
    const tree = new DocumentTree(new TargetDocumentNodeData(targetDoc, mappingTree, renderIndex));
    TreeParsingService.parseTree(tree);
    const expansionState: Record<string, boolean> = {};
    expandAll(tree.root, expansionState);
    return tree.flatten(expansionState);
  };

  const moveNoteRowOutOfItsIf = () => {
    const { fieldItem: noteItem, selector } = addGuard(itemItem, noteField, BODY_NOTE, `normalize-space(${BODY_NOTE})`);
    const rowsUnderIf = flattenTargetTree();
    MappingService.updateExpression(selector, BODY_NOTE);
    return { noteItem, rowsUnderIf, rowsAbsorbed: flattenTargetTree() };
  };

  beforeEach(() => {
    targetDoc = TestUtil.createTargetOrderDoc();
    sourceContext = {
      sourceParameterMap: new Map<string, IDocument>(),
      sourceBody: TestUtil.createSingleItemSourceOrderDoc(),
    };
    mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    mappingTree.namespaceMap = { ns0: SHIP_ORDER_NS };
    shipOrderItem = MappingService.createFieldItem(mappingTree, findField(targetDoc, 'ShipOrder'));
    itemItem = MappingService.createFieldItem(shipOrderItem, findField(shipOrderItem.field, 'Item'));
    noteField = findField(itemItem.field, 'Note');
  });

  it('should keep the key of a mapping row that a rebuild moves to another path', () => {
    const { noteItem, rowsUnderIf, rowsAbsorbed } = moveNoteRowOutOfItsIf();
    const rowUnderIf = rowsUnderIf[findRowIndex(rowsUnderIf, noteItem)];
    const absorbedRow = rowsAbsorbed[findRowIndex(rowsAbsorbed, noteItem)];

    expect(absorbedRow.treeNode.nodeData).not.toBe(rowUnderIf.treeNode.nodeData);
    expect(absorbedRow.path).not.toBe(rowUnderIf.path);
    expect(getRowKey(rowsUnderIf, noteItem)).toMatch(/^m:\d+$/);
    expect(getRowKey(rowsAbsorbed, noteItem)).toBe(getRowKey(rowsUnderIf, noteItem));
  });

  it.each([
    {
      change: 'an optional guard is added',
      isGuarded: false,
      applyChange: (noteRow: FieldItemNodeData) => {
        MappingActionService.addOptionalGuard(noteRow);
      },
    },
    {
      change: 'its optional guard is removed',
      isGuarded: true,
      applyChange: (noteRow: FieldItemNodeData) => {
        MappingActionService.removeOptionalGuard(noteRow);
      },
    },
  ])('should keep the key of a field row whose item is re-parented because $change', ({ isGuarded, applyChange }) => {
    const { fieldItem: noteItem } = isGuarded
      ? addGuard(itemItem, noteField, BODY_NOTE)
      : mapField(itemItem, noteField, BODY_NOTE);
    const rowsBefore = flattenTargetTree();
    const parentBefore = noteItem.parent;

    applyChange(findFieldItemRow(rowsBefore, noteItem));
    const rowsAfter = flattenTargetTree();

    expect(noteItem.parent).not.toBe(parentBefore);
    expect(getRowKey(rowsAfter, noteItem)).toBe(getRowKey(rowsBefore, noteItem));
  });

  it('should key a field row without a mapping by its path', () => {
    const rows = flattenTargetTree();
    const orderPersonIndex = rows.findIndex(
      ({ treeNode }) =>
        treeNode.nodeData instanceof TargetFieldNodeData && treeNode.nodeData.field.name === 'OrderPerson',
    );

    expect(orderPersonIndex).not.toBe(-1);
    expect(getTargetRowKeys(rows)[orderPersonIndex]).toBe(`p:${rows[orderPersonIndex].path}`);
  });

  it('should key only the first row of an item shown twice by the item, and the other row by its path', () => {
    const { noteItem, rowsUnderIf, rowsAbsorbed } = moveNoteRowOutOfItsIf();
    const rowUnderIf = rowsUnderIf[findRowIndex(rowsUnderIf, noteItem)];
    const absorbedRow = rowsAbsorbed[findRowIndex(rowsAbsorbed, noteItem)];

    expect(getTargetRowKeys([rowUnderIf, absorbedRow])).toEqual([
      getRowKey(rowsUnderIf, noteItem),
      `p:${absorbedRow.path}`,
    ]);
  });

  it('should give every row of a list a key of its own', () => {
    addGuard(itemItem, noteField, BODY_NOTE, `normalize-space(${BODY_NOTE})`);
    const shipToItem = MappingService.createFieldItem(shipOrderItem, findField(shipOrderItem.field, 'ShipTo'));
    const copyOf = new CopyOfSelector(shipToItem);
    copyOf.expression = '/ns0:ShipOrder/ShipTo/node()';
    shipToItem.children.push(copyOf);
    const rows = flattenTargetTree();

    const keys = getTargetRowKeys(rows);

    expect(keys).toHaveLength(rows.length);
    expect(new Set(keys).size).toBe(rows.length);
    expect(keys.some((key) => key.startsWith('m:'))).toBe(true);
    expect(keys.some((key) => key.startsWith('p:'))).toBe(true);
  });
});
