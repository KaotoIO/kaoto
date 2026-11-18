import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
} from '../../models/datamapper/document';
import { CopyOfSelector, FieldItem, MappingItem, MappingTree } from '../../models/datamapper/mapping';
import { MappingActionKind } from '../../models/datamapper/mapping-action';
import {
  AddMappingNodeData,
  CopyOfFieldNodeData,
  FieldItemNodeData,
  NodeData,
  TargetAbstractFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import {
  getChoiceRepeatingAbstractCatXslt,
  getChoiceRepeatingAbstractXsd,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { MappingActionService } from './mapping-action.service';
import { MappingActionRegistryService } from './mapping-action-registry.service';
import { VisualizationService } from './visualization.service';

describe('MappingActionService — Duplicate', () => {
  const NS = 'io.kaoto.datamapper.poc.test';

  const createChoiceRepeatingAbstractDoc = (): IDocument => {
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, BODY_DOCUMENT_ID, {
        'ChoiceRepeatingAbstract.xsd': getChoiceRepeatingAbstractXsd(),
      }),
    );
    if (!result.document) throw new Error('ChoiceRepeatingAbstract.xsd did not parse');
    return result.document;
  };

  const createTree = (doc: IDocument): MappingTree => {
    const tree = new MappingTree(doc.documentType, doc.documentId, DocumentDefinitionType.XML_SCHEMA);
    tree.namespaceMap = { ns0: NS };
    return tree;
  };

  const childrenOf = (node: NodeData): NodeData[] => VisualizationService.generateNonDocumentNodeDataChildren(node);

  const childNamed = (node: NodeData, name: string): TargetNodeData => {
    const child = childrenOf(node).find(
      (n) => (n instanceof TargetFieldNodeData || n instanceof FieldItemNodeData) && n.field.name === name,
    );
    if (!child) throw new Error(`No row named ${name}`);
    return child as TargetNodeData;
  };

  const isDuplicateOffered = (node: TargetNodeData): boolean =>
    MappingActionRegistryService.getMappingContextMenuItems(node).some(
      (item) => item.key === MappingActionKind.Duplicate,
    );

  const collectFieldItems = (item: MappingTree | MappingItem): FieldItem[] =>
    item.children.flatMap((child) => [...(child instanceof FieldItem ? [child] : []), ...collectFieldItems(child)]);

  describe('inside a copy-of row', () => {
    it('should not offer Duplicate on a repeating child of a copy-of row', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const tree = createTree(targetDoc);
      const copyOf = new CopyOfSelector(tree);
      copyOf.expression = '/ns0:ShipOrder';
      tree.children.push(copyOf);

      const [shipOrderRow] = VisualizationService.generateStructuredDocumentChildren(
        new TargetDocumentNodeData(targetDoc, tree),
      );
      expect(shipOrderRow).toBeInstanceOf(CopyOfFieldNodeData);

      expect(isDuplicateOffered(childNamed(shipOrderRow, 'Item'))).toBe(false);
    });

    it('should not offer Duplicate on a repeating row two levels below a copy-of row', () => {
      const targetDoc = createChoiceRepeatingAbstractDoc();
      const tree = createTree(targetDoc);
      const root = new FieldItem(tree, targetDoc.fields[0]);
      tree.children.push(root);
      const copyOf = new CopyOfSelector(root);
      copyOf.expression = '/ns0:Root/ns0:Order';
      root.children.push(copyOf);

      const [rootRow] = VisualizationService.generateStructuredDocumentChildren(
        new TargetDocumentNodeData(targetDoc, tree),
      );
      const orderRow = childrenOf(rootRow).find((n) => n instanceof CopyOfFieldNodeData);
      expect(orderRow).toBeDefined();
      const lineRow = childNamed(childNamed(orderRow as NodeData, 'Lines'), 'Line');

      expect(isDuplicateOffered(lineRow)).toBe(false);
    });

    it('should still offer Duplicate on a repeating row that is not inside a copy-of', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const tree = createTree(targetDoc);

      const [shipOrderRow] = VisualizationService.generateStructuredDocumentChildren(
        new TargetDocumentNodeData(targetDoc, tree),
      );

      expect(isDuplicateOffered(childNamed(shipOrderRow, 'Item'))).toBe(true);
    });
  });

  describe('under an unselected abstract wrapper', () => {
    it('should create the duplicate under the nearest real element, not for the wrapper', () => {
      const targetDoc = createChoiceRepeatingAbstractDoc();
      const tree = createTree(targetDoc);
      MappingSerializerService.deserialize(
        getChoiceRepeatingAbstractCatXslt(),
        targetDoc,
        tree,
        TestUtil.createParameterMap(),
      );

      const [rootRow] = VisualizationService.generateStructuredDocumentChildren(
        new TargetDocumentNodeData(targetDoc, tree),
      );
      const wrapperRow = childrenOf(childNamed(rootRow, 'AbstractInChoice')).find(
        (n) => n instanceof TargetAbstractFieldNodeData,
      ) as TargetAbstractFieldNodeData;
      expect(wrapperRow).toBeDefined();
      expect(wrapperRow.abstractField).toBeUndefined();
      const catRow = childNamed(wrapperRow, 'Cat');
      expect((catRow as FieldItemNodeData | TargetFieldNodeData).parent).toBe(wrapperRow);
      const dogRow = childNamed(wrapperRow, 'Dog');
      expect((dogRow as FieldItemNodeData | TargetFieldNodeData).parent).toBe(wrapperRow);

      MappingActionService.duplicateFieldNode(catRow as FieldItemNodeData | TargetFieldNodeData);

      const fieldItems = collectFieldItems(tree);
      expect(fieldItems.filter((item) => item.field.wrapperKind !== undefined)).toEqual([]);
      const abstractInChoice = fieldItems.find((item) => item.field.name === 'AbstractInChoice');
      const cats = abstractInChoice?.children.filter(
        (child) => child instanceof FieldItem && child.field.name === 'Cat',
      );
      expect(cats).toHaveLength(2);
    });
  });

  describe('Add mapping under an unselected abstract wrapper', () => {
    it('should create the new mapping under the nearest real element, not for the wrapper', () => {
      const targetDoc = createChoiceRepeatingAbstractDoc();
      const tree = createTree(targetDoc);
      MappingSerializerService.deserialize(
        getChoiceRepeatingAbstractCatXslt(),
        targetDoc,
        tree,
        TestUtil.createParameterMap(),
      );

      const [rootRow] = VisualizationService.generateStructuredDocumentChildren(
        new TargetDocumentNodeData(targetDoc, tree),
      );
      const wrapperRow = childrenOf(childNamed(rootRow, 'AbstractInChoice')).find(
        (n) => n instanceof TargetAbstractFieldNodeData,
      ) as TargetAbstractFieldNodeData;
      expect(wrapperRow).toBeDefined();
      expect(wrapperRow.abstractField).toBeUndefined();
      const catRow = childNamed(wrapperRow, 'Cat') as FieldItemNodeData | TargetFieldNodeData;
      const addMappingRow = new AddMappingNodeData(wrapperRow, catRow.field);

      MappingActionService.addMapping(addMappingRow);

      const fieldItems = collectFieldItems(tree);
      expect(fieldItems.filter((item) => item.field.wrapperKind !== undefined)).toEqual([]);
      const abstractInChoice = fieldItems.find((item) => item.field.name === 'AbstractInChoice');
      const cats = abstractInChoice?.children.filter(
        (child) => child instanceof FieldItem && child.field.name === 'Cat',
      ) as FieldItem[];
      expect(cats).toHaveLength(2);
    });
  });

  describe('under a plain field parent', () => {
    it('should create the parent field item and the duplicate, as before', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const tree = createTree(targetDoc);
      const [shipOrderRow] = VisualizationService.generateStructuredDocumentChildren(
        new TargetDocumentNodeData(targetDoc, tree),
      );

      MappingActionService.duplicateFieldNode(childNamed(shipOrderRow, 'Item') as TargetFieldNodeData);

      expect(tree.children).toHaveLength(1);
      const shipOrderItem = tree.children[0] as FieldItem;
      expect(shipOrderItem.field.name).toBe('ShipOrder');
      const itemItem = shipOrderItem.children[0] as FieldItem;
      expect(itemItem.field.name).toBe('Item');
      expect(itemItem.isUserCreated).toBe(true);
    });
  });
});
