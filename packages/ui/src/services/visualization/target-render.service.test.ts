import type { MockInstance } from 'vitest';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import {
  CopyOfSelector,
  CopyOfType,
  FieldItem,
  ForEachGroupItem,
  ForEachItem,
  IfItem,
  MappingItem,
  MappingParentType,
  MappingTree,
} from '../../models/datamapper/mapping';
import { NS_XPATH_FUNCTIONS } from '../../models/datamapper/standard-namespaces';
import {
  FieldItemNodeData,
  ISourceDocumentContext,
  MappingNodeData,
  NodeData,
  TargetDocumentNodeData,
  TargetRenderIndex,
} from '../../models/datamapper/visualization';
import {
  getAccountJsonSchema,
  getAccountNameRequiredJsonSchema,
  getCartToShipOrderOptionalGuardsXslt,
  getCartXsd,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { JsonSchemaField } from '../document/json-schema/json-schema-document.model';
import { MappingService } from '../mapping/mapping.service';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { TargetRenderService } from './target-render.service';
import { VisualizationService } from './visualization.service';

const SHIP_ORDER_NS = 'io.kaoto.datamapper.poc.test';
const CART_NS = 'kaoto.datamapper.test';
const NOTE = 'Note';
const TITLE = 'Title';
const QUANTITY = 'Quantity';
const BODY_NOTE = '/ns0:ShipOrder/Item/Note';
const CART_NOTE = '$cart/ns1:Cart/Item/Note';
const ACCOUNT_NAME = "$Account-x/fn:map/fn:string[@key='Name']";

const findField = (parent: IDocument | IField, name: string, ...descendantNames: string[]): IField => {
  let field = parent.fields.find((child) => child.name === name);
  for (const descendantName of descendantNames) {
    field = field?.fields.find((child) => child.name === descendantName);
  }
  if (!field) throw new Error(`No field at '${[name, ...descendantNames].join('/')}'`);
  return field;
};

const findJsonField = (parent: IField, key: string): IField => {
  const field = parent.fields.find((child) => child instanceof JsonSchemaField && child.key === key);
  if (!field) throw new Error(`No JSON field keyed '${key}'`);
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

const collectIfItems = (item: MappingTree | MappingItem): IfItem[] => {
  const ifItems: IfItem[] = item instanceof IfItem ? [item] : [];
  for (const child of item.children) {
    ifItems.push(...collectIfItems(child));
  }
  return ifItems;
};

const targetPath = (...items: MappingItem[]): string => `targetBody:Body://${items.map((item) => item.id).join('/')}`;

const findFieldRow = (nodes: NodeData[], fieldItem: FieldItem): FieldItemNodeData | undefined => {
  for (const node of nodes) {
    if (node instanceof FieldItemNodeData && node.mapping === fieldItem) return node;
    if (node instanceof MappingNodeData) {
      const row = findFieldRow(VisualizationService.generateNonDocumentNodeDataChildren(node), fieldItem);
      if (row) return row;
    }
  }
  return undefined;
};

const createJsonFixture = (accountSchema: string) => {
  const targetDoc = TestUtil.createJSONTargetOrderDoc();
  const accountDoc = TestUtil.createParamOrderDoc('Account', DocumentDefinitionType.JSON_SCHEMA, accountSchema);
  const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.JSON_SCHEMA);
  tree.namespaceMap = { fn: NS_XPATH_FUNCTIONS };
  const rootField = targetDoc.fields[0];
  const sourceContext: ISourceDocumentContext = {
    sourceParameterMap: new Map<string, IDocument>([['Account', accountDoc]]),
    sourceBody: new PrimitiveDocument(
      new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    ),
  };
  return {
    tree,
    rootItem: MappingService.createFieldItem(tree, rootField),
    orderPersonField: findJsonField(rootField, 'OrderPerson'),
    nameField: findJsonField(accountDoc.fields[0], 'Name'),
    sourceContext,
  };
};

describe('TargetRenderService', () => {
  let targetDoc: IDocument;
  let sourceBody: IDocument;
  let cartDoc: IDocument;
  let sourceContext: ISourceDocumentContext;
  let mappingTree: MappingTree;
  let shipOrderItem: FieldItem;
  let itemLoop: ForEachItem;
  let itemItem: FieldItem;
  let noteField: IField;

  const buildIndex = () => TargetRenderService.buildIndex(mappingTree, sourceContext);

  const addLoop = (select: string): ForEachItem => {
    const loop = new ForEachItem(shipOrderItem);
    loop.expression = select;
    shipOrderItem.children.push(loop);
    return loop;
  };

  beforeEach(() => {
    targetDoc = TestUtil.createTargetOrderDoc();
    sourceBody = TestUtil.createSourceOrderDoc();
    cartDoc = TestUtil.createParamOrderDoc('cart', DocumentDefinitionType.XML_SCHEMA, getCartXsd());
    sourceContext = { sourceParameterMap: new Map<string, IDocument>([['cart', cartDoc]]), sourceBody };
    mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    mappingTree.namespaceMap = { ns0: SHIP_ORDER_NS, ns1: CART_NS };
    shipOrderItem = MappingService.createFieldItem(mappingTree, findField(targetDoc, 'ShipOrder'));
    itemLoop = addLoop('/ns0:ShipOrder/Item');
    itemItem = MappingService.createFieldItem(itemLoop, findField(shipOrderItem.field, 'Item'));
    noteField = findField(itemItem.field, 'Note');
  });

  describe('computeSeeThroughField()', () => {
    it('should return the guarded field when the source is optional', () => {
      const { guard, fieldItem } = addGuard(itemItem, noteField, NOTE);

      expect(TargetRenderService.computeSeeThroughField(guard, sourceContext)).toBe(fieldItem);
    });

    it('should return undefined when the source is required', () => {
      const { guard } = addGuard(itemItem, noteField, TITLE);

      expect(TargetRenderService.computeSeeThroughField(guard, sourceContext)).toBeUndefined();
    });

    it('should return undefined when the source path does not resolve to a source field', () => {
      const { guard } = addGuard(itemItem, noteField, 'Comment');

      expect(TargetRenderService.computeSeeThroughField(guard, sourceContext)).toBeUndefined();
    });

    it('should return undefined without source documents to resolve the source against', () => {
      const { guard } = addGuard(itemItem, noteField, NOTE);

      expect(TargetRenderService.computeSeeThroughField(guard, undefined)).toBeUndefined();
    });

    it('should return undefined when the test is not a simple path', () => {
      const { guard } = addGuard(itemItem, noteField, `upper-case(${NOTE})`);

      expect(TargetRenderService.computeSeeThroughField(guard, sourceContext)).toBeUndefined();
    });

    it('should return undefined when the selector maps more than one source', () => {
      const { guard } = addGuard(itemItem, noteField, `${NOTE}, ${CART_NOTE}`);

      expect(TargetRenderService.computeSeeThroughField(guard, sourceContext)).toBeUndefined();
    });

    it('should return undefined when the selector does not match the test', () => {
      const { guard } = addGuard(itemItem, noteField, NOTE, CART_NOTE);

      expect(TargetRenderService.computeSeeThroughField(guard, sourceContext)).toBeUndefined();
    });

    it('should return undefined when the target field is required', () => {
      const { guard } = addGuard(itemItem, findField(itemItem.field, 'Title'), NOTE);

      expect(TargetRenderService.computeSeeThroughField(guard, sourceContext)).toBeUndefined();
    });

    it('should compare a container copy-of with the test without its /node() suffix', () => {
      const guard = new IfItem(itemItem);
      guard.expression = NOTE;
      itemItem.children.push(guard);
      const fieldItem = MappingService.createFieldItem(guard, noteField);
      const copyOf = new CopyOfSelector(fieldItem, CopyOfType.CONTAINER_NODE);
      copyOf.expression = `${NOTE}/node()`;
      fieldItem.children.push(copyOf);

      expect(TargetRenderService.computeSeeThroughField(guard, sourceContext)).toBe(fieldItem);
    });

    it('should resolve an optional JSON source', () => {
      const json = createJsonFixture(getAccountJsonSchema());
      const { guard, fieldItem } = addGuard(json.rootItem, json.orderPersonField, ACCOUNT_NAME);

      expect(TargetRenderService.computeSeeThroughField(guard, json.sourceContext)).toBe(fieldItem);
    });

    it('should return undefined for a JSON source that its schema requires', () => {
      const json = createJsonFixture(getAccountNameRequiredJsonSchema());
      const { guard } = addGuard(json.rootItem, json.orderPersonField, ACCOUNT_NAME);

      expect(TargetRenderService.computeSeeThroughField(guard, json.sourceContext)).toBeUndefined();
    });

    it('should resolve a parameter source against the select of the enclosing for-each', () => {
      const cartItem = MappingService.createFieldItem(addLoop('$cart/ns1:Cart/Item'), itemItem.field);
      const { guard: noteGuard, fieldItem: noteItem } = addGuard(cartItem, noteField, NOTE);
      const { guard: titleGuard } = addGuard(cartItem, noteField, TITLE);

      expect(TargetRenderService.computeSeeThroughField(noteGuard, sourceContext)).toBe(noteItem);
      expect(TargetRenderService.computeSeeThroughField(titleGuard, sourceContext)).toBeUndefined();
    });

    it('should return undefined when the source path goes through a collection the context does not iterate', () => {
      const { guard: bodyGuard } = addGuard(itemItem, noteField, BODY_NOTE);
      const { guard: cartGuard } = addGuard(itemItem, noteField, CART_NOTE);

      expect(TargetRenderService.computeSeeThroughField(bodyGuard, sourceContext)).toBeUndefined();
      expect(TargetRenderService.computeSeeThroughField(cartGuard, sourceContext)).toBeUndefined();
    });

    it('should evaluate a candidate test without writing it to the guard', () => {
      const { guard, fieldItem, selector } = addGuard(itemItem, noteField, NOTE);
      MappingService.updateExpression(selector, `./${NOTE}`);

      expect(TargetRenderService.computeSeeThroughField(guard, sourceContext)).toBeUndefined();
      expect(TargetRenderService.computeSeeThroughField(guard, sourceContext, `./${NOTE}`)).toBe(fieldItem);
      expect(guard.expression).toBe(NOTE);
    });

    it('should reject a candidate test whose source is required, leaving the guard as it is', () => {
      const { guard, selector } = addGuard(itemItem, noteField, NOTE);
      MappingService.updateExpression(selector, TITLE);

      expect(TargetRenderService.computeSeeThroughField(guard, sourceContext, TITLE)).toBeUndefined();
      expect(guard.expression).toBe(NOTE);
    });

    it('should reject a candidate test that goes through a collection, leaving the guard as it is', () => {
      const { guard, selector } = addGuard(itemItem, noteField, NOTE);
      MappingService.updateExpression(selector, BODY_NOTE);

      expect(TargetRenderService.computeSeeThroughField(guard, sourceContext, BODY_NOTE)).toBeUndefined();
      expect(guard.expression).toBe(NOTE);
    });

    it('should keep a commented guard see-through', () => {
      const { guard, fieldItem } = addGuard(itemItem, noteField, NOTE);
      MappingService.updateComment(guard, 'Only when the item has a note');

      expect(TargetRenderService.computeSeeThroughField(guard, sourceContext)).toBe(fieldItem);
    });
  });

  describe('isOptionalSourceSelector()', () => {
    it('should accept a selector that resolves to one optional source field', () => {
      const { selector } = mapField(itemItem, noteField, NOTE);

      expect(TargetRenderService.isOptionalSourceSelector(selector, sourceContext)).toBe(true);
    });

    it('should reject a selector that resolves to a required source field', () => {
      const { selector } = mapField(itemItem, noteField, TITLE);

      expect(TargetRenderService.isOptionalSourceSelector(selector, sourceContext)).toBe(false);
    });

    it('should reject a selector that resolves to several source fields, even when all of them are optional', () => {
      const json = createJsonFixture(getAccountJsonSchema());
      const { selector } = mapField(
        json.rootItem,
        json.orderPersonField,
        `${ACCOUNT_NAME}, $Account-x/fn:map/fn:map[@key='Address']`,
      );

      expect(TargetRenderService.isOptionalSourceSelector(selector, json.sourceContext)).toBe(false);
    });

    it('should reject a selector whose path goes through a collection the context does not iterate', () => {
      const { selector } = mapField(itemItem, noteField, BODY_NOTE);

      expect(TargetRenderService.isOptionalSourceSelector(selector, sourceContext)).toBe(false);
    });

    it('should reject every selector without source documents', () => {
      const { selector } = mapField(itemItem, noteField, NOTE);

      expect(TargetRenderService.isOptionalSourceSelector(selector, undefined)).toBe(false);
    });
  });

  describe('canAddOptionalGuard()', () => {
    const getFieldRow = (fieldItem: FieldItem, renderIndex: TargetRenderIndex = buildIndex()): FieldItemNodeData => {
      const documentNode = new TargetDocumentNodeData(targetDoc, mappingTree, renderIndex);
      const row = findFieldRow(VisualizationService.generateStructuredDocumentChildren(documentNode), fieldItem);
      if (!row) throw new Error(`No row renders '${fieldItem.field.name}'`);
      return row;
    };

    it('should accept an optional field mapped by a simple path to an optional source', () => {
      const { fieldItem } = mapField(itemItem, noteField, NOTE);

      expect(TargetRenderService.canAddOptionalGuard(getFieldRow(fieldItem))).toBe(true);
    });

    it('should reject a field whose source is required', () => {
      const { fieldItem } = mapField(itemItem, noteField, TITLE);

      expect(TargetRenderService.canAddOptionalGuard(getFieldRow(fieldItem))).toBe(false);
    });

    it('should reject a field whose source path goes through a collection the field does not iterate', () => {
      const { fieldItem } = mapField(itemItem, noteField, CART_NOTE);

      expect(TargetRenderService.canAddOptionalGuard(getFieldRow(fieldItem))).toBe(false);
    });

    it('should reject a field whose selector is not a simple path', () => {
      const { fieldItem } = mapField(itemItem, noteField, `upper-case(${NOTE})`);

      expect(TargetRenderService.canAddOptionalGuard(getFieldRow(fieldItem))).toBe(false);
    });

    it('should reject a field under a visible if', () => {
      const { guard, fieldItem } = addGuard(itemItem, noteField, `${NOTE} != ''`, NOTE);
      const renderIndex = buildIndex();
      expect(renderIndex.isAbsorbed(guard)).toBe(false);

      expect(TargetRenderService.canAddOptionalGuard(getFieldRow(fieldItem, renderIndex))).toBe(false);
    });

    it('should reject a field whose target is required', () => {
      const { fieldItem } = mapField(itemItem, findField(itemItem.field, 'Title'), NOTE);

      expect(TargetRenderService.canAddOptionalGuard(getFieldRow(fieldItem))).toBe(false);
    });

    it('should reject a field whose row was built without source documents', () => {
      const { fieldItem } = mapField(itemItem, noteField, NOTE);
      const row = getFieldRow(fieldItem, TargetRenderIndex.EMPTY);
      expect(row.renderIndex.sourceContext).toBeUndefined();

      expect(TargetRenderService.canAddOptionalGuard(row)).toBe(false);
    });
  });

  describe('guards created by drag-and-drop', () => {
    it('should absorb a guard created for an optional body source in a for-each body', () => {
      const sourceNoteField = findField(sourceBody, 'ShipOrder', 'Item', 'Note');
      const noteItem = MappingService.createFieldItem(itemItem, noteField);
      MappingService.mapToField(sourceNoteField, noteItem);

      const created = MappingService.tryAutoOptionalIfWrap(noteItem, sourceNoteField, false);
      const renderIndex = buildIndex();

      expect(created?.expression).toBe(NOTE);
      expect(renderIndex.isAbsorbed(created)).toBe(true);
      expect(TargetRenderService.getRenderedChildFields(itemItem, renderIndex)).toEqual([noteItem]);
    });

    it('should create no guard for a source reached through a collection the field does not iterate, as the tree would not absorb one', () => {
      const cartNoteField = findField(cartDoc, 'Cart', 'Item', 'Note');
      const noteItem = MappingService.createFieldItem(itemItem, noteField);
      MappingService.mapToField(cartNoteField, noteItem);

      expect(MappingService.tryAutoOptionalIfWrap(noteItem, cartNoteField, false)).toBeUndefined();
      expect(noteItem.parent).toBe(itemItem);

      const { guard } = addGuard(itemItem, noteField, CART_NOTE);
      expect(buildIndex().isAbsorbed(guard)).toBe(false);
    });

    it('should absorb a guard created for an optional source in a for-each body', () => {
      const cartItemField = findField(cartDoc, 'Cart', 'Item');
      const cartNoteField = findField(cartItemField, 'Note');
      const forEach = new ForEachItem(shipOrderItem);
      shipOrderItem.children.push(forEach);
      MappingService.mapToCondition(forEach, cartItemField);
      const loopItem = MappingService.createFieldItem(forEach, itemItem.field);
      const noteItem = MappingService.createFieldItem(loopItem, noteField);
      MappingService.mapToField(cartNoteField, noteItem);

      const created = MappingService.tryAutoOptionalIfWrap(noteItem, cartNoteField, false);
      const renderIndex = buildIndex();

      expect(forEach.expression).toBe('$cart/ns1:Cart/Item');
      expect(created?.expression).toBe('Note');
      expect(renderIndex.isAbsorbed(created)).toBe(true);
      expect(TargetRenderService.getRenderedChildFields(loopItem, renderIndex)).toEqual([noteItem]);
    });

    it('should absorb a guard created for an optional JSON source', () => {
      const json = createJsonFixture(getAccountJsonSchema());
      const orderPersonItem = MappingService.createFieldItem(json.rootItem, json.orderPersonField);
      MappingService.mapToField(json.nameField, orderPersonItem);

      const created = MappingService.tryAutoOptionalIfWrap(orderPersonItem, json.nameField, false);
      const renderIndex = TargetRenderService.buildIndex(json.tree, json.sourceContext);

      expect(created?.expression).toBe(ACCOUNT_NAME);
      expect(renderIndex.isAbsorbed(created)).toBe(true);
      expect(TargetRenderService.getRenderedChildFields(json.rootItem, renderIndex)).toEqual([orderPersonItem]);
    });
  });

  describe('buildIndex()', () => {
    let loadedTree: MappingTree;
    let renderIndex: TargetRenderIndex;

    beforeEach(() => {
      loadedTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(
        getCartToShipOrderOptionalGuardsXslt(),
        targetDoc,
        loadedTree,
        sourceContext.sourceParameterMap,
      );
      renderIndex = TargetRenderService.buildIndex(loadedTree, sourceContext);
    });

    it('should absorb a loaded guard only when its source is optional', () => {
      const decisions = collectIfItems(loadedTree).map((guard) => [guard.expression, renderIndex.isAbsorbed(guard)]);

      expect(decisions).toEqual([
        ['Note', true],
        ['Title', false],
        ['Note', true],
        ['$cart/ns0:Cart/Item/Note', false],
      ]);
    });

    it('should absorb a loaded guard that carries a comment', () => {
      const commentedGuards = collectIfItems(loadedTree).filter((guard) => guard.comment);

      expect(commentedGuards).toHaveLength(1);
      expect(commentedGuards[0].comment).toBe('Write the note only when the cart item has one');
      expect(renderIndex.getAbsorbingField(commentedGuards[0])).toBe(commentedGuards[0].children[0]);
    });

    it('should record the field each see-through guard is absorbed into', () => {
      const [loopGuard, requiredGuard] = collectIfItems(loadedTree);

      expect(renderIndex.getAbsorbingField(loopGuard)).toBe(loopGuard.children[0]);
      expect(renderIndex.getAbsorbingField(requiredGuard)).toBeUndefined();
    });

    it('should record the rendered paths, with no segment for an absorbed guard', () => {
      const shipOrder = loadedTree.children[0];
      const [forEach, requiredLoop] = shipOrder.children;
      const loopItem = forEach.children[0];
      const requiredItem = requiredLoop.children[0];
      const [loopGuard, requiredGuard] = collectIfItems(loadedTree);
      const loopNote = loopGuard.children[0];
      const requiredNote = requiredGuard.children[0];

      expect(renderIndex.getSnapshotPath(shipOrder)).toBe(targetPath(shipOrder));
      expect(renderIndex.getSnapshotPath(loopItem)).toBe(targetPath(shipOrder, forEach, loopItem));
      expect(renderIndex.getSnapshotPath(loopGuard)).toBeUndefined();
      expect(renderIndex.getSnapshotPath(loopNote)).toBe(targetPath(shipOrder, forEach, loopItem, loopNote));
      expect(renderIndex.getSnapshotPath(requiredGuard)).toBe(
        targetPath(shipOrder, requiredLoop, requiredItem, requiredGuard),
      );
      expect(renderIndex.getSnapshotPath(requiredNote)).toBe(
        targetPath(shipOrder, requiredLoop, requiredItem, requiredGuard, requiredNote),
      );
    });

    it('should keep a live handle on the source documents the decisions were made against', () => {
      expect(renderIndex.hasSnapshot).toBe(true);
      expect(renderIndex.sourceContext).toBe(sourceContext);
    });

    it('should give every index it builds a higher generation than the one before', () => {
      const rebuiltRenderIndex = buildIndex();

      expect(rebuiltRenderIndex.generation).toBeGreaterThan(renderIndex.generation);
      expect(renderIndex.generation).toBeGreaterThan(0);
      expect(TargetRenderIndex.EMPTY.generation).toBe(0);
      expect(TargetRenderIndex.EMPTY.hasSnapshot).toBe(false);
    });
  });

  describe('hasDecisionChanged()', () => {
    it('should report no change while every decision still matches the snapshot', () => {
      const { selector } = addGuard(itemItem, noteField, NOTE);
      const { guard: visibleGuard } = addGuard(itemItem, noteField, TITLE);
      const renderIndex = buildIndex();

      expect(TargetRenderService.hasDecisionChanged(selector, renderIndex)).toBe(false);
      expect(TargetRenderService.hasDecisionChanged(visibleGuard, renderIndex)).toBe(false);
    });

    it('should report a selector edit that makes an absorbed guard visible', () => {
      const { selector } = addGuard(itemItem, noteField, NOTE);
      const renderIndex = buildIndex();

      MappingService.updateExpression(selector, `upper-case(${NOTE})`);

      expect(TargetRenderService.hasDecisionChanged(selector, renderIndex)).toBe(true);
    });

    it('should report a selector edit that makes a visible if see-through', () => {
      const { selector } = addGuard(itemItem, noteField, NOTE, TITLE);
      const renderIndex = buildIndex();

      MappingService.updateExpression(selector, NOTE);

      expect(TargetRenderService.hasDecisionChanged(selector, renderIndex)).toBe(true);
    });

    it('should report an if edit that makes the if see-through', () => {
      const { guard } = addGuard(itemItem, noteField, TITLE, NOTE);
      const renderIndex = buildIndex();

      MappingService.updateExpression(guard, NOTE);

      expect(TargetRenderService.hasDecisionChanged(guard, renderIndex)).toBe(true);
    });

    it.each([
      { name: 'for-each', createLoop: (parent: MappingItem) => new ForEachItem(parent) },
      { name: 'for-each-group', createLoop: (parent: MappingItem) => new ForEachGroupItem(parent) },
    ])('should report a $name select change that re-resolves the guards in its body', ({ createLoop }) => {
      const loop = createLoop(shipOrderItem);
      loop.expression = '$cart/ns1:Cart/Item';
      shipOrderItem.children.push(loop);
      const loopItem = MappingService.createFieldItem(loop, itemItem.field);
      const { guard } = addGuard(loopItem, noteField, 'Note');
      const renderIndex = buildIndex();

      expect(renderIndex.isAbsorbed(guard)).toBe(true);

      MappingService.updateExpression(loop, '/ns0:ShipOrder/Item');
      expect(TargetRenderService.hasDecisionChanged(loop, renderIndex)).toBe(false);

      MappingService.updateExpression(loop, '$cart/ns1:Cart');
      expect(TargetRenderService.hasDecisionChanged(loop, renderIndex)).toBe(true);
    });

    it('should not re-evaluate the guards in the body of an item that is not a loop', () => {
      const { selector } = addGuard(itemItem, noteField, NOTE);
      const renderIndex = buildIndex();

      MappingService.updateExpression(selector, `upper-case(${NOTE})`);

      expect(TargetRenderService.hasDecisionChanged(itemItem, renderIndex)).toBe(false);
    });

    it('should report a see-through guard created after the snapshot', () => {
      const sourceNoteField = findField(sourceBody, 'ShipOrder', 'Item', 'Note');
      const noteItem = MappingService.createFieldItem(itemItem, noteField);
      MappingService.mapToField(sourceNoteField, noteItem);
      const renderIndex = buildIndex();

      MappingService.tryAutoOptionalIfWrap(noteItem, sourceNoteField, false);

      expect(noteItem.parent).toBeInstanceOf(IfItem);
      expect(TargetRenderService.hasDecisionChanged(noteItem, renderIndex)).toBe(true);
    });

    it('should not report an if created after the snapshot that is not see-through', () => {
      const { fieldItem } = mapField(itemItem, noteField, NOTE);
      const renderIndex = buildIndex();

      MappingService.wrapWithIf(fieldItem);

      expect(fieldItem.parent).toBeInstanceOf(IfItem);
      expect(TargetRenderService.hasDecisionChanged(fieldItem, renderIndex)).toBe(false);
    });
  });

  describe('getTargetPath()', () => {
    it('should resolve the mapping tree by its node path, so a refreshed root shell resolves too', () => {
      const renderIndex = buildIndex();
      const refreshedTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );

      expect(TargetRenderService.getTargetPath(mappingTree, renderIndex)).toBe('targetBody:Body://');
      expect(TargetRenderService.getTargetPath(refreshedTree, renderIndex)).toBe('targetBody:Body://');
    });

    it('should return the snapshot path even after the live tree changed around the item', () => {
      const { fieldItem } = addGuard(itemItem, noteField, NOTE);
      const renderIndex = buildIndex();
      const notePath = targetPath(shipOrderItem, itemLoop, itemItem, fieldItem);

      MappingService.wrapWithIf(itemItem);

      expect(TargetRenderService.getTargetPath(fieldItem, renderIndex)).toBe(notePath);
      expect(TargetRenderService.computeTargetPath(fieldItem, renderIndex).toString()).not.toBe(notePath);
    });

    it('should resolve an absorbed guard to the path of its parent', () => {
      const { guard } = addGuard(itemItem, noteField, NOTE);

      expect(TargetRenderService.getTargetPath(guard, buildIndex())).toBe(
        targetPath(shipOrderItem, itemLoop, itemItem),
      );
    });

    it('should compute the path of an item added after the snapshot from the live tree', () => {
      const renderIndex = buildIndex();
      const quantityItem = MappingService.createFieldItem(itemItem, findField(itemItem.field, 'Quantity'));
      const quantityPath = targetPath(shipOrderItem, itemLoop, itemItem, quantityItem);

      expect(renderIndex.getSnapshotPath(quantityItem)).toBeUndefined();
      expect(TargetRenderService.getTargetPath(quantityItem, renderIndex)).toBe(quantityPath);
    });

    it('should apply the snapshot absorption to the live path of an item added under an absorbed guard', () => {
      const { fieldItem } = addGuard(itemItem, noteField, NOTE);
      const renderIndex = buildIndex();
      const copyOf = new CopyOfSelector(fieldItem, CopyOfType.CONTAINER_NODE);
      copyOf.expression = `${NOTE}/node()`;
      fieldItem.children.push(copyOf);
      const copyOfPath = targetPath(shipOrderItem, itemLoop, itemItem, fieldItem, copyOf);

      expect(TargetRenderService.getTargetPath(copyOf, renderIndex)).toBe(copyOfPath);
    });

    it('should compute every path from the live tree, absorbing nothing, without a snapshot', () => {
      const { guard, fieldItem } = addGuard(itemItem, noteField, NOTE);
      const guardedNotePath = targetPath(shipOrderItem, itemLoop, itemItem, guard, fieldItem);

      expect(TargetRenderService.getTargetPath(fieldItem, TargetRenderIndex.EMPTY)).toBe(guardedNotePath);
    });
  });

  describe('getTargetPath() development warning', () => {
    let warnSpy: MockInstance<typeof console.warn>;

    const stubDevelopmentBuild = () => {
      vi.stubEnv('DEV', true);
      vi.stubEnv('MODE', 'development');
    };

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
      vi.unstubAllEnvs();
    });

    it('should warn once per row-producing item that is missing from the snapshot', () => {
      stubDevelopmentBuild();
      const renderIndex = buildIndex();
      const titleItem = MappingService.createFieldItem(itemItem, findField(itemItem.field, 'Title'));
      const quantityItem = MappingService.createFieldItem(itemItem, findField(itemItem.field, 'Quantity'));

      TargetRenderService.getTargetPath(titleItem, renderIndex);
      TargetRenderService.getTargetPath(titleItem, renderIndex);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenLastCalledWith(expect.stringContaining(titleItem.id));

      TargetRenderService.getTargetPath(quantityItem, renderIndex);

      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenLastCalledWith(expect.stringContaining(quantityItem.id));
    });

    it('should not warn for an inline selector, which has no row of its own', () => {
      stubDevelopmentBuild();
      const noteItem = MappingService.createFieldItem(itemItem, noteField);
      const renderIndex = buildIndex();
      const selector = MappingService.createValueOfSelector(noteItem);
      noteItem.children.push(selector);
      const selectorPath = targetPath(shipOrderItem, itemLoop, itemItem, noteItem, selector);

      expect(TargetRenderService.getTargetPath(selector, renderIndex)).toBe(selectorPath);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should not warn without a snapshot', () => {
      stubDevelopmentBuild();
      const titleItem = MappingService.createFieldItem(itemItem, findField(itemItem.field, 'Title'));

      TargetRenderService.getTargetPath(titleItem, TargetRenderIndex.EMPTY);

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should stay silent in the test mode', () => {
      vi.stubEnv('DEV', true);
      vi.stubEnv('MODE', 'test');
      const renderIndex = buildIndex();
      const titleItem = MappingService.createFieldItem(itemItem, findField(itemItem.field, 'Title'));

      TargetRenderService.getTargetPath(titleItem, renderIndex);

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('computeTargetPath()', () => {
    it('should add a segment for a visible if but none for an absorbed guard', () => {
      const { fieldItem: absorbedField } = addGuard(itemItem, noteField, NOTE);
      const { guard: visibleGuard, fieldItem: visibleField } = addGuard(itemItem, noteField, TITLE);
      const renderIndex = buildIndex();
      const absorbedPath = targetPath(shipOrderItem, itemLoop, itemItem, absorbedField);
      const visiblePath = targetPath(shipOrderItem, itemLoop, itemItem, visibleGuard, visibleField);

      expect(TargetRenderService.computeTargetPath(absorbedField, renderIndex).toString()).toBe(absorbedPath);
      expect(TargetRenderService.computeTargetPath(visibleField, renderIndex).toString()).toBe(visiblePath);
    });
  });

  describe('getRenderedChildFields()', () => {
    it('should list the child fields together with the fields of absorbed guards', () => {
      const { fieldItem: titleItem } = mapField(itemItem, findField(itemItem.field, 'Title'), TITLE);
      const { fieldItem: noteItem } = addGuard(itemItem, noteField, NOTE);
      const { fieldItem: quantityItem } = mapField(itemItem, findField(itemItem.field, 'Quantity'), QUANTITY);
      const renderIndex = buildIndex();

      expect(TargetRenderService.getRenderedChildFields(itemItem, renderIndex)).toEqual([
        titleItem,
        noteItem,
        quantityItem,
      ]);
    });

    it('should leave out the field of a visible if, which is rendered under the if row', () => {
      const { fieldItem: titleItem } = mapField(itemItem, findField(itemItem.field, 'Title'), TITLE);
      addGuard(itemItem, noteField, TITLE);

      expect(TargetRenderService.getRenderedChildFields(itemItem, buildIndex())).toEqual([titleItem]);
    });
  });

  describe('isRenderedInstruction()', () => {
    it('should not treat an absorbed guard as a row of its own', () => {
      const { guard } = addGuard(itemItem, noteField, NOTE);

      expect(TargetRenderService.isRenderedInstruction(guard, buildIndex())).toBe(false);
    });

    it('should treat a visible if and a for-each as rows of their own', () => {
      const { guard } = addGuard(itemItem, noteField, TITLE);
      const forEach = new ForEachItem(shipOrderItem);
      shipOrderItem.children.push(forEach);
      const renderIndex = buildIndex();

      expect(TargetRenderService.isRenderedInstruction(guard, renderIndex)).toBe(true);
      expect(TargetRenderService.isRenderedInstruction(forEach, renderIndex)).toBe(true);
    });

    it('should not treat a field or the mapping tree as an instruction', () => {
      const renderIndex = buildIndex();

      expect(TargetRenderService.isRenderedInstruction(itemItem, renderIndex)).toBe(false);
      expect(TargetRenderService.isRenderedInstruction(mappingTree, renderIndex)).toBe(false);
    });
  });

  describe('findGuardOwner()', () => {
    let documentNode: TargetDocumentNodeData;
    let itemNode: FieldItemNodeData;

    beforeEach(() => {
      documentNode = new TargetDocumentNodeData(targetDoc, mappingTree);
      itemNode = new FieldItemNodeData(new FieldItemNodeData(documentNode, shipOrderItem), itemItem);
    });

    it('should return a field row itself', () => {
      expect(TargetRenderService.findGuardOwner(itemNode, itemItem)).toBe(itemNode);
    });

    it('should return the field row of a selector shown as a row of its own', () => {
      const noteItem = MappingService.createFieldItem(itemItem, noteField);
      const copyOf = new CopyOfSelector(noteItem, CopyOfType.CONTAINER_NODE);
      copyOf.expression = `${NOTE}/node()`;
      noteItem.children.push(copyOf);
      const noteNode = new FieldItemNodeData(itemNode, noteItem);

      expect(TargetRenderService.findGuardOwner(new MappingNodeData(noteNode, copyOf), copyOf)).toBe(noteNode);
    });

    it('should not return the parent row of a selector that belongs to another field', () => {
      const noteNode = new FieldItemNodeData(itemNode, MappingService.createFieldItem(itemItem, noteField));
      const { selector } = mapField(itemItem, findField(itemItem.field, 'Title'), TITLE);

      expect(TargetRenderService.findGuardOwner(new MappingNodeData(noteNode, selector), selector)).toBeUndefined();
    });

    it('should not return a field row for an instruction row', () => {
      const { guard } = addGuard(itemItem, noteField, TITLE);

      expect(TargetRenderService.findGuardOwner(new MappingNodeData(itemNode, guard), guard)).toBeUndefined();
    });

    it('should not return a field row for the document row', () => {
      expect(TargetRenderService.findGuardOwner(documentNode, mappingTree)).toBeUndefined();
    });
  });

  describe('getSelectorInputOwner()', () => {
    it('should return the field when its selector is edited inline on the field row', () => {
      const { fieldItem } = mapField(itemItem, noteField, NOTE);

      expect(TargetRenderService.getSelectorInputOwner(fieldItem)).toBe(fieldItem);
    });

    it('should return a container copy-of, which has a row of its own', () => {
      const copyOf = new CopyOfSelector(itemItem, CopyOfType.CONTAINER_NODE);
      copyOf.expression = '/ns0:ShipOrder/Item/node()';
      itemItem.children.push(copyOf);

      expect(TargetRenderService.getSelectorInputOwner(itemItem)).toBe(copyOf);
    });

    it('should return the field when it has no single selector', () => {
      mapField(itemItem, noteField, NOTE);

      expect(TargetRenderService.getSelectorInputOwner(itemItem)).toBe(itemItem);
    });
  });
});
