import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import {
  ChooseItem,
  FieldItem,
  ForEachGroupItem,
  ForEachItem,
  IfItem,
  MappingTree,
  OtherwiseItem,
  ValueSelector,
  WhenItem,
} from '../../models/datamapper/mapping';
import { MappingActionKind } from '../../models/datamapper/mapping-action';
import {
  AddMappingNodeData,
  FieldItemNodeData,
  MappingNodeData,
  TargetAbstractFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import { getFieldSubstitutionXsd, getShipOrderToShipOrderXslt, TestUtil } from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { MappingActionService } from './mapping-action.service';
import { MappingActionRegistryService } from './mapping-action-registry.service';
import { VisualizationService } from './visualization.service';

describe('MappingActionService — instruction wrapping', () => {
  let targetDoc: XmlSchemaDocument;
  let paramsMap: Map<string, IDocument>;
  let tree: MappingTree;
  let targetDocNode: TargetDocumentNodeData;

  beforeEach(() => {
    targetDoc = TestUtil.createTargetOrderDoc();
    paramsMap = TestUtil.createParameterMap();
    tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
  });

  describe('without pre-populated mappings', () => {
    beforeEach(() => {
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    describe('applyIf()', () => {
      it('should add If', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(docChildren).toHaveLength(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren).toHaveLength(4);
        expect(shipOrderChildren[0].title).toBe('OrderId');
        MappingActionService.applyIf(shipOrderChildren[0] as TargetNodeData);

        expect(tree.children[0].name).toContain('fx-ShipOrder');
        expect(tree.children[0].children[0].name).toBe('if');
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[0].title).toBe('if');
        const ifChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
        expect(ifChildren).toHaveLength(1);
        expect(ifChildren[0].title).toBe('OrderId');
      });

      it('should add If on primitive target body', () => {
        const primitiveTargetDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        tree = new MappingTree(
          primitiveTargetDoc.documentType,
          primitiveTargetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        targetDocNode = new TargetDocumentNodeData(primitiveTargetDoc, tree);
        MappingActionService.applyIf(targetDocNode);

        expect(VisualizationService.hasChildren(targetDocNode)).toBeTruthy();
        let targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        expect(targetDocChildren).toHaveLength(1);
        const ifItem = (targetDocChildren[0] as MappingNodeData).mapping;
        expect(ifItem instanceof IfItem).toBeTruthy();
        expect(ifItem.name).toBe('if');

        targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        const ifChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(ifChildren).toHaveLength(1);
        expect((ifChildren[0] as MappingNodeData).mapping instanceof ValueSelector).toBeTruthy();
      });
    });

    describe('applyChooseWhenOtherwise()', () => {
      it('should add Choose-When-Otherwise', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(docChildren).toHaveLength(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren).toHaveLength(4);
        expect(shipOrderChildren[1].title).toBe('OrderPerson');
        MappingActionService.applyChooseWhenOtherwise(shipOrderChildren[1] as TargetNodeData);

        expect(tree.children[0].name).toContain('fx-ShipOrder');
        expect(tree.children[0].children[0].name).toBe('choose');
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);

        expect(shipOrderChildren[1].title).toBe('choose');
        const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[1]);
        expect(chooseChildren).toHaveLength(2);

        expect(chooseChildren[0].title).toBe('when');
        const whenChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseChildren[0]);
        expect(whenChildren).toHaveLength(1);
        const whenOrderPerson = whenChildren[0] as MappingNodeData;
        expect(whenOrderPerson.title).toBe('OrderPerson');
        expect(whenOrderPerson.mapping.parent instanceof WhenItem).toBeTruthy();

        expect(chooseChildren[1].title).toBe('otherwise');
        const otherwiseChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseChildren[1]);
        expect(otherwiseChildren).toHaveLength(1);
        const otherwiseOrderPerson = otherwiseChildren[0] as MappingNodeData;
        expect(otherwiseOrderPerson.title).toBe('OrderPerson');
        expect(otherwiseOrderPerson.mapping.parent instanceof OtherwiseItem).toBeTruthy();
      });

      it('should add Choose-When-Otherwise on primitive target body', () => {
        const primitiveTargetDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        tree = new MappingTree(
          primitiveTargetDoc.documentType,
          primitiveTargetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        targetDocNode = new TargetDocumentNodeData(primitiveTargetDoc, tree);
        MappingActionService.applyChooseWhenOtherwise(targetDocNode);

        expect(VisualizationService.hasChildren(targetDocNode)).toBeTruthy();
        let targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        expect(targetDocChildren).toHaveLength(1);
        const chooseItem = (targetDocChildren[0] as MappingNodeData).mapping;
        expect(chooseItem instanceof ChooseItem).toBeTruthy();
        expect(chooseItem.name).toBe('choose');

        targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(chooseChildren).toHaveLength(2);
        const whenItem = (chooseChildren[0] as MappingNodeData).mapping;
        expect(whenItem instanceof WhenItem).toBeTruthy();
        expect(whenItem.children[0] instanceof ValueSelector).toBeTruthy();

        const otherwiseItem = (chooseChildren[1] as MappingNodeData).mapping;
        expect(otherwiseItem instanceof OtherwiseItem).toBeTruthy();
        expect(otherwiseItem.children[0] instanceof ValueSelector).toBeTruthy();
      });
    });

    describe('applyWhen()', () => {
      it('should addWhen', () => {
        let targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        MappingActionService.applyChooseWhenOtherwise(targetShipOrderChildren[1] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        MappingActionService.applyWhen(targetShipOrderChildren[1] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetShipOrderChildren[1]);
        expect(chooseChildren).toHaveLength(3);

        const whenItem1 = (chooseChildren[0] as MappingNodeData).mapping;
        expect(whenItem1 instanceof WhenItem).toBeTruthy();
        expect(whenItem1.children).toHaveLength(1);
        expect(whenItem1.children[0] instanceof FieldItem).toBeTruthy();

        const whenItem2 = (chooseChildren[1] as MappingNodeData).mapping;
        expect(whenItem2 instanceof WhenItem).toBeTruthy();
        expect(whenItem2.children).toHaveLength(1);
        expect(whenItem2.children[0] instanceof FieldItem).toBeTruthy();

        const otherwiseItem = (chooseChildren[2] as MappingNodeData).mapping;
        expect(otherwiseItem instanceof OtherwiseItem).toBeTruthy();
        expect(otherwiseItem.children).toHaveLength(1);
        expect(otherwiseItem.children[0] instanceof FieldItem).toBeTruthy();
      });

      it('should add When in primitive target body choose', () => {
        const primitiveTargetDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        tree = new MappingTree(
          primitiveTargetDoc.documentType,
          primitiveTargetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        targetDocNode = new TargetDocumentNodeData(primitiveTargetDoc, tree);
        MappingActionService.applyChooseWhenOtherwise(targetDocNode);

        let targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        MappingActionService.applyWhen(targetDocChildren[0] as TargetNodeData);

        targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(chooseChildren).toHaveLength(3);

        const whenItem1 = (chooseChildren[0] as MappingNodeData).mapping;
        expect(whenItem1 instanceof WhenItem).toBeTruthy();
        expect(whenItem1.children).toHaveLength(1);
        expect(whenItem1.children[0] instanceof ValueSelector).toBeTruthy();

        const whenItem2 = (chooseChildren[1] as MappingNodeData).mapping;
        expect(whenItem2 instanceof WhenItem).toBeTruthy();
        expect(whenItem2.children).toHaveLength(1);
        expect(whenItem2.children[0] instanceof ValueSelector).toBeTruthy();

        const otherwiseItem = (chooseChildren[2] as MappingNodeData).mapping;
        expect(otherwiseItem instanceof OtherwiseItem).toBeTruthy();
        expect(otherwiseItem.children).toHaveLength(1);
        expect(otherwiseItem.children[0] instanceof ValueSelector).toBeTruthy();
      });
    });

    describe('applyOtherwise()', () => {
      it('should add Otherwise', () => {
        let targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        MappingActionService.applyChooseWhenOtherwise(targetShipOrderChildren[1] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        let chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetShipOrderChildren[1]);
        MappingActionService.deleteMappingItem(chooseChildren[1] as MappingNodeData);
        MappingActionService.applyOtherwise(targetShipOrderChildren[1] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetShipOrderChildren[1]);
        expect(chooseChildren).toHaveLength(2);

        const whenItem = (chooseChildren[0] as MappingNodeData).mapping;
        expect(whenItem instanceof WhenItem).toBeTruthy();
        expect(whenItem.children).toHaveLength(1);
        expect(whenItem.children[0] instanceof FieldItem).toBeTruthy();

        const otherwiseItem = (chooseChildren[1] as MappingNodeData).mapping;
        expect(otherwiseItem instanceof OtherwiseItem).toBeTruthy();
        expect(otherwiseItem.children).toHaveLength(1);
        expect(otherwiseItem.children[0] instanceof FieldItem).toBeTruthy();
      });

      it('should add Otherwise in primitive target body choose', () => {
        const primitiveTargetDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        tree = new MappingTree(
          primitiveTargetDoc.documentType,
          primitiveTargetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        targetDocNode = new TargetDocumentNodeData(primitiveTargetDoc, tree);
        MappingActionService.applyChooseWhenOtherwise(targetDocNode);

        let targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        let chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        MappingActionService.deleteMappingItem(chooseChildren[1] as MappingNodeData);
        MappingActionService.applyOtherwise(targetDocChildren[0] as TargetNodeData);

        targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(chooseChildren).toHaveLength(2);

        const whenItem = (chooseChildren[0] as MappingNodeData).mapping;
        expect(whenItem instanceof WhenItem).toBeTruthy();
        expect(whenItem.children).toHaveLength(1);
        expect(whenItem.children[0] instanceof ValueSelector).toBeTruthy();

        const otherwiseItem = (chooseChildren[1] as MappingNodeData).mapping;
        expect(otherwiseItem instanceof OtherwiseItem).toBeTruthy();
        expect(otherwiseItem.children).toHaveLength(1);
        expect(otherwiseItem.children[0] instanceof ValueSelector).toBeTruthy();
      });
    });

    describe('applyForEach()', () => {
      it('should add for-each', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(docChildren).toHaveLength(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren).toHaveLength(4);
        expect(shipOrderChildren[3].title).toBe('Item');
        MappingActionService.applyForEach(shipOrderChildren[3] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[3].title).toBe('for-each');
        const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[3]);
        expect(forEachChildren).toHaveLength(1);
        expect(forEachChildren[0].title).toBe('Item');
      });
    });

    describe('applyForEach() on abstract wrapper field', () => {
      it('should wrap the abstract wrapper itself, not its parent', () => {
        const NS_SUBSTITUTION = 'http://www.example.com/SUBSTITUTION';
        const definition = new DocumentDefinition(
          DocumentType.TARGET_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'test-doc',
          { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
        );
        definition.rootElementChoice = { namespaceUri: NS_SUBSTITUTION, name: 'Zoo' };
        const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
        if (!result.document) throw new Error('Failed to create test document');
        const document = result.document;

        const mappingTree = new MappingTree(
          document.documentType,
          document.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const docNode = new TargetDocumentNodeData(document, mappingTree);

        const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
        const zooChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const equipmentNode = zooChildren.find((c) => c.title === 'Equipment');
        expect(equipmentNode).toBeDefined();
        const equipmentChildren = VisualizationService.generateNonDocumentNodeDataChildren(equipmentNode!);
        const optionsNode = equipmentChildren.find((c) => c.title === 'Options');
        expect(optionsNode).toBeDefined();
        const optionsChildren = VisualizationService.generateNonDocumentNodeDataChildren(optionsNode!);
        expect(optionsChildren).toHaveLength(1);
        const abstractWrapperNode = optionsChildren[0];
        expect(abstractWrapperNode).toBeInstanceOf(TargetAbstractFieldNodeData);

        MappingActionService.applyForEach(abstractWrapperNode as TargetAbstractFieldNodeData);

        expect(mappingTree.children).toHaveLength(1);
        const zooFieldItem = mappingTree.children[0] as FieldItem;
        expect(zooFieldItem).toBeInstanceOf(FieldItem);
        expect(zooFieldItem.field.name).toBe('Zoo');

        const equipmentFieldItem = zooFieldItem.children[0] as FieldItem;
        expect(equipmentFieldItem.field.name).toBe('Equipment');
        const optionsFieldItem = equipmentFieldItem.children[0] as FieldItem;
        expect(optionsFieldItem.field.name).toBe('Options');

        const optionsChild = optionsFieldItem.children[0];
        expect(optionsChild).toBeInstanceOf(ForEachItem);
        const forEachItem = optionsChild as ForEachItem;
        expect(forEachItem.children).toHaveLength(1);
        const wrappedFieldItem = forEachItem.children[0] as FieldItem;
        expect(wrappedFieldItem).toBeInstanceOf(FieldItem);
        expect(wrappedFieldItem.field.wrapperKind).toBe('abstract');
      });
    });

    describe('applyForEachGroup()', () => {
      it('should add for-each-group', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(docChildren).toHaveLength(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren).toHaveLength(4);
        expect(shipOrderChildren[3].title).toBe('Item');
        MappingActionService.applyForEachGroup(shipOrderChildren[3] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[3].title).toBe('for-each-group');
        const forEachGroupChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[3]);
        expect(forEachGroupChildren).toHaveLength(1);
        expect(forEachGroupChildren[0].title).toBe('Item');
      });
    });

    describe('applyForEachCurrentGroup()', () => {
      it('should wrap with for-each and set expression to current-group()', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[3].title).toBe('Item');

        MappingActionService.applyForEachGroup(shipOrderChildren[3] as TargetFieldNodeData);
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(updatedDocChildren[0]);
        const forEachGroupNode = shipOrderChildren[3] as MappingNodeData;
        expect(forEachGroupNode.title).toBe('for-each-group');

        const forEachGroupChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachGroupNode);
        const itemInsideGroup = forEachGroupChildren[0] as FieldItemNodeData;
        expect(itemInsideGroup.title).toBe('Item');

        MappingActionService.applyForEachCurrentGroup(itemInsideGroup);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const finalDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const finalShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(finalDocChildren[0]);
        const finalForEachGroupNode = finalShipOrderChildren[3] as MappingNodeData;
        const finalGroupChildren = VisualizationService.generateNonDocumentNodeDataChildren(finalForEachGroupNode);
        const forEachNode = finalGroupChildren[0] as MappingNodeData;
        expect(forEachNode.title).toBe('for-each');
        expect((forEachNode.mapping as ForEachItem).expression).toBe('current-group()');
      });
    });

    describe('applyInnerForEach()', () => {
      it('should add inner for-each', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(docChildren).toHaveLength(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren).toHaveLength(4);
        expect(shipOrderChildren[0].title).toBe('OrderId');
        MappingActionService.applyInnerForEach(shipOrderChildren[0] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[0].title).toBe('OrderId');
        const orderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
        // Should have at least one child which is the for-each
        expect(orderIdChildren.length).toBeGreaterThanOrEqual(1);
        const forEachChild = orderIdChildren.find((child) => child.title === 'for-each');
        expect(forEachChild).toBeDefined();
        expect(forEachChild?.title).toBe('for-each');
      });

      it('should add multiple inner for-each as siblings when applied to the same field', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[0].title).toBe('OrderId');

        // Add first inner for-each
        MappingActionService.applyInnerForEach(shipOrderChildren[0] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);

        // Add second inner for-each to the same field (not to the for-each node)
        MappingActionService.applyInnerForEach(shipOrderChildren[0] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const orderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);

        // Should have 2 for-each children as siblings
        const forEachChildren = orderIdChildren.filter((child) => child.title === 'for-each');
        expect(forEachChildren).toHaveLength(2);

        // Both should be direct children of OrderId (siblings, not nested)
        forEachChildren.forEach((forEachChild) => {
          expect((forEachChild as MappingNodeData).mapping.parent).toBe(
            (shipOrderChildren[0] as FieldItemNodeData).mapping,
          );
        });
      });

      it('should nest inner for-each when applied to an existing for-each node', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[0].title).toBe('OrderId');

        // Add first inner for-each
        MappingActionService.applyInnerForEach(shipOrderChildren[0] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const orderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
        const firstForEach = orderIdChildren.find((child) => child.title === 'for-each');

        // Add second inner for-each to the for-each node itself (should nest)
        MappingActionService.applyInnerForEach(firstForEach as TargetNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const updatedOrderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);

        // Should still have only 1 for-each at the OrderId level
        const topLevelForEach = updatedOrderIdChildren.filter((child) => child.title === 'for-each');
        expect(topLevelForEach).toHaveLength(1);

        // The nested for-each should be a child of the first for-each
        const nestedChildren = VisualizationService.generateNonDocumentNodeDataChildren(topLevelForEach[0]);
        const nestedForEach = nestedChildren.find((child) => child.title === 'for-each');
        expect(nestedForEach).toBeDefined();
        expect((nestedForEach as MappingNodeData).mapping.parent).toBe((topLevelForEach[0] as MappingNodeData).mapping);
      });
    });

    describe('applyInnerForEachGroup()', () => {
      it('should add inner for-each-group', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[0].title).toBe('OrderId');
        MappingActionService.applyInnerForEachGroup(shipOrderChildren[0] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[0].title).toBe('OrderId');
        const orderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
        expect(orderIdChildren.length).toBeGreaterThanOrEqual(1);
        const forEachGroupChild = orderIdChildren.find((child) => child.title === 'for-each-group');
        expect(forEachGroupChild).toBeDefined();
        expect(forEachGroupChild?.title).toBe('for-each-group');
      });

      it('should nest inner for-each-group when applied to an existing for-each node', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);

        MappingActionService.applyInnerForEach(shipOrderChildren[0] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const orderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
        const forEachNode = orderIdChildren.find((child) => child.title === 'for-each');

        MappingActionService.applyInnerForEachGroup(forEachNode as TargetNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const updatedOrderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);

        const topLevelForEach = updatedOrderIdChildren.filter((child) => child.title === 'for-each');
        expect(topLevelForEach).toHaveLength(1);

        const nestedChildren = VisualizationService.generateNonDocumentNodeDataChildren(topLevelForEach[0]);
        const nestedForEachGroup = nestedChildren.find((child) => child.title === 'for-each-group');
        expect(nestedForEachGroup).toBeDefined();
        expect((nestedForEachGroup as MappingNodeData).mapping instanceof ForEachGroupItem).toBeTruthy();
      });
    });

    describe('applyInnerForEachCurrentGroup()', () => {
      it('should add inner for-each with expression current-group() inside for-each-group', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[3].title).toBe('Item');

        MappingActionService.applyForEachGroup(shipOrderChildren[3] as TargetFieldNodeData);
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        let updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(updatedDocChildren[0]);
        const forEachGroupNode = shipOrderChildren[3] as MappingNodeData;
        expect(forEachGroupNode.title).toBe('for-each-group');

        MappingActionService.applyInnerForEachCurrentGroup(forEachGroupNode);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(updatedDocChildren[0]);
        const updatedGroupNode = shipOrderChildren[3] as MappingNodeData;
        const groupChildren = VisualizationService.generateNonDocumentNodeDataChildren(updatedGroupNode);
        const forEachNode = groupChildren.find((child) => child.title === 'for-each');
        expect(forEachNode).toBeDefined();
        expect((forEachNode as MappingNodeData).mapping instanceof ForEachItem).toBeTruthy();
        expect(((forEachNode as MappingNodeData).mapping as ForEachItem).expression).toBe('current-group()');
      });

      it('should not be allowed outside for-each-group context', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[3].title).toBe('Item');

        MappingActionService.applyForEach(shipOrderChildren[3] as TargetFieldNodeData);
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );
        const forEachNode = updatedShipOrderChildren[3] as MappingNodeData;
        expect(forEachNode.title).toBe('for-each');
        expect(MappingActionRegistryService.getAllowedActions(forEachNode)).not.toContain(
          MappingActionKind.InnerForEachCurrentGroup,
        );
      });

      it('should be allowed on for-each-group node', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[3].title).toBe('Item');

        MappingActionService.applyForEachGroup(shipOrderChildren[3] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );
        const forEachGroupNode = updatedShipOrderChildren[3] as MappingNodeData;
        expect(forEachGroupNode.title).toBe('for-each-group');
        expect(MappingActionRegistryService.getAllowedActions(forEachGroupNode)).toContain(
          MappingActionKind.InnerForEachCurrentGroup,
        );
      });

      it('should not be allowed inside existing for-each current-group()', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[3].title).toBe('Item');

        MappingActionService.applyForEachGroup(shipOrderChildren[3] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        let updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(updatedDocChildren[0]);
        const forEachGroupNode = updatedShipOrderChildren[3] as MappingNodeData;

        MappingActionService.applyInnerForEachCurrentGroup(forEachGroupNode);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(updatedDocChildren[0]);
        const forEachGroupNode2 = updatedShipOrderChildren[3] as MappingNodeData;
        const groupChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachGroupNode2);
        const forEachCurrentGroupNode = groupChildren.find((child) => child.title === 'for-each') as MappingNodeData;
        expect((forEachCurrentGroupNode.mapping as ForEachItem).expression).toBe('current-group()');

        expect(MappingActionRegistryService.getAllowedActions(forEachCurrentGroupNode)).not.toContain(
          MappingActionKind.InnerForEachCurrentGroup,
        );
      });
    });

    describe('applyInnerChooseWhenOtherwise()', () => {
      it('should add inner choose-when-otherwise', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(docChildren).toHaveLength(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren).toHaveLength(4);
        expect(shipOrderChildren[1].title).toBe('OrderPerson');
        MappingActionService.applyInnerChooseWhenOtherwise(shipOrderChildren[1] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[1].title).toBe('OrderPerson');
        const orderPersonChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[1]);
        // Should have at least one child which is the choose
        expect(orderPersonChildren.length).toBeGreaterThanOrEqual(1);
        const chooseChild = orderPersonChildren.find((child) => child.title === 'choose');
        expect(chooseChild).toBeDefined();
        expect(chooseChild?.title).toBe('choose');

        // Verify choose has when and otherwise branches
        const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseChild!);
        expect(chooseChildren).toHaveLength(2);
        expect(chooseChildren[0].title).toBe('when');
        expect(chooseChildren[1].title).toBe('otherwise');
      });

      it('should add when with ValueSelector (not FieldItem) to inner choose', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[1].title).toBe('OrderPerson');
        MappingActionService.applyInnerChooseWhenOtherwise(shipOrderChildren[1] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const orderPersonChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[1]);
        const chooseChild = orderPersonChildren.find((child) => child.title === 'choose');

        // Add a new when branch
        MappingActionService.applyWhen(chooseChild as TargetNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const updatedOrderPersonChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          shipOrderChildren[1],
        );
        const updatedChooseChild = updatedOrderPersonChildren.find((child) => child.title === 'choose');
        const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(updatedChooseChild!);

        // Should have 3 children now: 2 when + 1 otherwise
        expect(chooseChildren).toHaveLength(3);
        expect(chooseChildren[0].title).toBe('when');
        expect(chooseChildren[1].title).toBe('when');
        expect(chooseChildren[2].title).toBe('otherwise');

        // Verify the new when branch contains a ValueSelector, not a FieldItem
        const newWhenChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseChildren[1]);
        expect(newWhenChildren).toHaveLength(1);
        expect((newWhenChildren[0] as MappingNodeData).mapping instanceof ValueSelector).toBeTruthy();
      });

      it('should add when with ValueSelector to inner choose nested inside inner for-each', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[0].title).toBe('OrderId');

        // First add inner for-each
        MappingActionService.applyInnerForEach(shipOrderChildren[0] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const orderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
        const forEachChild = orderIdChildren.find((child) => child.title === 'for-each');

        // Then add inner choose inside the for-each
        MappingActionService.applyInnerChooseWhenOtherwise(forEachChild as TargetNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const updatedOrderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
        const updatedForEachChild = updatedOrderIdChildren.find((child) => child.title === 'for-each');
        const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(updatedForEachChild!);
        const chooseChild = forEachChildren.find((child) => child.title === 'choose');

        // Add a new when branch to the choose that's inside the for-each
        MappingActionService.applyWhen(chooseChild as TargetNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const finalOrderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
        const finalForEachChild = finalOrderIdChildren.find((child) => child.title === 'for-each');
        const finalForEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(finalForEachChild!);
        const finalChooseChild = finalForEachChildren.find((child) => child.title === 'choose');
        const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(finalChooseChild!);

        // Should have 3 children: 2 when + 1 otherwise
        expect(chooseChildren).toHaveLength(3);
        expect(chooseChildren[0].title).toBe('when');
        expect(chooseChildren[1].title).toBe('when');
        expect(chooseChildren[2].title).toBe('otherwise');

        // Verify the new when branch contains a ValueSelector, not a FieldItem
        const newWhenChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseChildren[1]);
        expect(newWhenChildren).toHaveLength(1);
        expect((newWhenChildren[0] as MappingNodeData).mapping instanceof ValueSelector).toBeTruthy();
      });
    });

    describe('applyInnerIf()', () => {
      it('should add inner if', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(docChildren).toHaveLength(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren).toHaveLength(4);
        expect(shipOrderChildren[0].title).toBe('OrderId');
        MappingActionService.applyInnerIf(shipOrderChildren[0] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[0].title).toBe('OrderId');
        const orderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
        // Should have at least one child which is the if
        expect(orderIdChildren.length).toBeGreaterThanOrEqual(1);
        const ifChild = orderIdChildren.find((child) => child.title === 'if');
        expect(ifChild).toBeDefined();
        expect(ifChild?.title).toBe('if');
      });

      it('should add nested inner if inside an existing IfItem', () => {
        // First add an inner if to OrderId
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        MappingActionService.applyInnerIf(shipOrderChildren[0] as TargetFieldNodeData);

        // Get the created if node
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const orderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
        const ifChild = orderIdChildren.find((child) => child.title === 'if');
        expect(ifChild).toBeDefined();

        // Now apply inner if on the IfItem itself
        MappingActionService.applyInnerIf(ifChild as TargetNodeData);

        // Verify the nested structure
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const updatedOrderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
        const updatedIfChild = updatedOrderIdChildren.find((child) => child.title === 'if');

        // The if should now have a nested if inside it
        const nestedIfChildren = VisualizationService.generateNonDocumentNodeDataChildren(updatedIfChild!);
        const nestedIf = nestedIfChildren.find((child) => child.title === 'if');
        expect(nestedIf).toBeDefined();
        expect(nestedIf?.title).toBe('if');
      });
    });
  });

  describe('with pre-populated mappings', () => {
    beforeEach(() => {
      MappingSerializerService.deserialize(getShipOrderToShipOrderXslt(), targetDoc, tree, paramsMap);
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    describe('applyIf() on AddMappingNodeData', () => {
      it('should wrap with if when applied to an AddMappingNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(shipOrderChildren).toHaveLength(5);

        expect(shipOrderChildren[4] instanceof AddMappingNodeData).toBeTruthy();
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(addMappingNode.title).toBe('Item');

        const shipOrderMappingItem = targetDocNode.mappingTree.children[0];
        const childCountBefore = shipOrderMappingItem.children.length;

        MappingActionService.applyIf(addMappingNode);

        expect(shipOrderMappingItem.children).toHaveLength(childCountBefore + 1);
        const newChild = shipOrderMappingItem.children[childCountBefore];
        expect(newChild instanceof IfItem).toBeTruthy();

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );
        const ifNodes = updatedShipOrderChildren.filter((c) => c.title === 'if');
        const ifNode = ifNodes[ifNodes.length - 1];
        expect(ifNode).toBeDefined();
        const ifChildren = VisualizationService.generateNonDocumentNodeDataChildren(ifNode);
        expect(ifChildren).toHaveLength(1);
        expect(ifChildren[0].title).toBe('Item');
      });
    });

    describe('applyChooseWhenOtherwise() on AddMappingNodeData', () => {
      it('should wrap with choose-when-otherwise when applied to an AddMappingNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(shipOrderChildren).toHaveLength(5);

        expect(shipOrderChildren[4] instanceof AddMappingNodeData).toBeTruthy();
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(addMappingNode.title).toBe('Item');

        const shipOrderMappingItem = targetDocNode.mappingTree.children[0];
        const childCountBefore = shipOrderMappingItem.children.length;

        MappingActionService.applyChooseWhenOtherwise(addMappingNode);

        expect(shipOrderMappingItem.children).toHaveLength(childCountBefore + 1);
        const newChild = shipOrderMappingItem.children[childCountBefore];
        expect(newChild instanceof ChooseItem).toBeTruthy();

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );
        const chooseNode = updatedShipOrderChildren.find((c) => c.title === 'choose');
        expect(chooseNode).toBeDefined();
        const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseNode!);
        expect(chooseChildren).toHaveLength(2);
        expect(chooseChildren[0].title).toBe('when');
        expect(chooseChildren[1].title).toBe('otherwise');
      });
    });
  });
});
