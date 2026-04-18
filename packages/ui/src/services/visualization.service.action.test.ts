import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  PrimitiveDocument,
} from '../models/datamapper/document';
import {
  ChooseItem,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingTree,
  OtherwiseItem,
  UnknownMappingItem,
  ValueSelector,
  WhenItem,
} from '../models/datamapper/mapping';
import {
  AddMappingNodeData,
  ChoiceFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingActionKind,
  MappingNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
  UnknownMappingNodeData,
} from '../models/datamapper/visualization';
import {
  getConditionalMappingsToShipOrderXslt,
  getContactsXsd,
  getExtensionSimpleXsd,
  getOrgXsd,
  getShipOrderToShipOrderInvalidForEachXslt,
  getShipOrderToShipOrderXslt,
  getTestDocumentXsd,
  getUnknownApplyTemplateXslt,
  TestUtil,
} from '../stubs/datamapper/data-mapper';
import { MappingSerializerService } from './mapping-serializer.service';
import { MappingActionService, VisualizationService } from './visualization.service';
import { XmlSchemaDocument } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';

describe('VisualizationService - Mapping Actions', () => {
  let sourceDoc: XmlSchemaDocument;
  let sourceDocNode: DocumentNodeData;
  let targetDoc: XmlSchemaDocument;
  let paramsMap: Map<string, IDocument>;
  let tree: MappingTree;
  let targetDocNode: TargetDocumentNodeData;

  beforeEach(() => {
    sourceDoc = TestUtil.createSourceOrderDoc();
    sourceDocNode = new DocumentNodeData(sourceDoc);
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
        expect(docChildren.length).toEqual(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren.length).toEqual(4);
        expect(shipOrderChildren[0].title).toEqual('OrderId');
        VisualizationService.applyIf(shipOrderChildren[0] as TargetNodeData);

        expect(tree.children[0].name).toContain('fx-ShipOrder');
        expect(tree.children[0].children[0].name).toEqual('if');
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[0].title).toEqual('if');
        const ifChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
        expect(ifChildren.length).toEqual(1);
        expect(ifChildren[0].title).toEqual('OrderId');
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
        VisualizationService.applyIf(targetDocNode);

        expect(VisualizationService.hasChildren(targetDocNode)).toBeTruthy();
        let targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        expect(targetDocChildren.length).toEqual(1);
        const ifItem = (targetDocChildren[0] as MappingNodeData).mapping;
        expect(ifItem instanceof IfItem).toBeTruthy();
        expect(ifItem.name).toEqual('if');

        targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        const ifChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(ifChildren.length).toEqual(1);
        expect((ifChildren[0] as MappingNodeData).mapping instanceof ValueSelector).toBeTruthy();
      });
    });

    describe('applyChooseWhenOtherwise()', () => {
      it('should add Choose-When-Otherwise', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(docChildren.length).toEqual(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren.length).toEqual(4);
        expect(shipOrderChildren[1].title).toEqual('OrderPerson');
        VisualizationService.applyChooseWhenOtherwise(shipOrderChildren[1] as TargetNodeData);

        expect(tree.children[0].name).toContain('fx-ShipOrder');
        expect(tree.children[0].children[0].name).toEqual('choose');
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);

        expect(shipOrderChildren[1].title).toEqual('choose');
        const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[1]);
        expect(chooseChildren.length).toEqual(2);

        expect(chooseChildren[0].title).toEqual('when');
        const whenChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseChildren[0]);
        expect(whenChildren.length).toEqual(1);
        const whenOrderPerson = whenChildren[0] as MappingNodeData;
        expect(whenOrderPerson.title).toEqual('OrderPerson');
        expect(whenOrderPerson.mapping.parent instanceof WhenItem).toBeTruthy();

        expect(chooseChildren[1].title).toEqual('otherwise');
        const otherwiseChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseChildren[1]);
        expect(otherwiseChildren.length).toEqual(1);
        const otherwiseOrderPerson = otherwiseChildren[0] as MappingNodeData;
        expect(otherwiseOrderPerson.title).toEqual('OrderPerson');
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
        VisualizationService.applyChooseWhenOtherwise(targetDocNode);

        expect(VisualizationService.hasChildren(targetDocNode)).toBeTruthy();
        let targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        expect(targetDocChildren.length).toEqual(1);
        const chooseItem = (targetDocChildren[0] as MappingNodeData).mapping;
        expect(chooseItem instanceof ChooseItem).toBeTruthy();
        expect(chooseItem.name).toEqual('choose');

        targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(chooseChildren.length).toEqual(2);
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
        VisualizationService.applyChooseWhenOtherwise(targetShipOrderChildren[1] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        VisualizationService.applyWhen(targetShipOrderChildren[1] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetShipOrderChildren[1]);
        expect(chooseChildren.length).toEqual(3);

        const whenItem1 = (chooseChildren[0] as MappingNodeData).mapping;
        expect(whenItem1 instanceof WhenItem).toBeTruthy();
        expect(whenItem1.children.length).toEqual(1);
        expect(whenItem1.children[0] instanceof FieldItem).toBeTruthy();

        const whenItem2 = (chooseChildren[1] as MappingNodeData).mapping;
        expect(whenItem2 instanceof WhenItem).toBeTruthy();
        expect(whenItem2.children.length).toEqual(1);
        expect(whenItem2.children[0] instanceof FieldItem).toBeTruthy();

        const otherwiseItem = (chooseChildren[2] as MappingNodeData).mapping;
        expect(otherwiseItem instanceof OtherwiseItem).toBeTruthy();
        expect(otherwiseItem.children.length).toEqual(1);
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
        VisualizationService.applyChooseWhenOtherwise(targetDocNode);

        let targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        VisualizationService.applyWhen(targetDocChildren[0] as TargetNodeData);

        targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(chooseChildren.length).toEqual(3);

        const whenItem1 = (chooseChildren[0] as MappingNodeData).mapping;
        expect(whenItem1 instanceof WhenItem).toBeTruthy();
        expect(whenItem1.children.length).toEqual(1);
        expect(whenItem1.children[0] instanceof ValueSelector).toBeTruthy();

        const whenItem2 = (chooseChildren[1] as MappingNodeData).mapping;
        expect(whenItem2 instanceof WhenItem).toBeTruthy();
        expect(whenItem2.children.length).toEqual(1);
        expect(whenItem2.children[0] instanceof ValueSelector).toBeTruthy();

        const otherwiseItem = (chooseChildren[2] as MappingNodeData).mapping;
        expect(otherwiseItem instanceof OtherwiseItem).toBeTruthy();
        expect(otherwiseItem.children.length).toEqual(1);
        expect(otherwiseItem.children[0] instanceof ValueSelector).toBeTruthy();
      });
    });

    describe('applyOtherwise()', () => {
      it('should add Otherwise', () => {
        let targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        VisualizationService.applyChooseWhenOtherwise(targetShipOrderChildren[1] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        let chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetShipOrderChildren[1]);
        VisualizationService.deleteMappingItem(chooseChildren[1] as MappingNodeData);
        VisualizationService.applyOtherwise(targetShipOrderChildren[1] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetShipOrderChildren[1]);
        expect(chooseChildren.length).toEqual(2);

        const whenItem = (chooseChildren[0] as MappingNodeData).mapping;
        expect(whenItem instanceof WhenItem).toBeTruthy();
        expect(whenItem.children.length).toEqual(1);
        expect(whenItem.children[0] instanceof FieldItem).toBeTruthy();

        const otherwiseItem = (chooseChildren[1] as MappingNodeData).mapping;
        expect(otherwiseItem instanceof OtherwiseItem).toBeTruthy();
        expect(otherwiseItem.children.length).toEqual(1);
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
        VisualizationService.applyChooseWhenOtherwise(targetDocNode);

        let targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        let chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        VisualizationService.deleteMappingItem(chooseChildren[1] as MappingNodeData);
        VisualizationService.applyOtherwise(targetDocChildren[0] as TargetNodeData);

        targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(chooseChildren.length).toEqual(2);

        const whenItem = (chooseChildren[0] as MappingNodeData).mapping;
        expect(whenItem instanceof WhenItem).toBeTruthy();
        expect(whenItem.children.length).toEqual(1);
        expect(whenItem.children[0] instanceof ValueSelector).toBeTruthy();

        const otherwiseItem = (chooseChildren[1] as MappingNodeData).mapping;
        expect(otherwiseItem instanceof OtherwiseItem).toBeTruthy();
        expect(otherwiseItem.children.length).toEqual(1);
        expect(otherwiseItem.children[0] instanceof ValueSelector).toBeTruthy();
      });
    });

    describe('applyForEach()', () => {
      it('should add for-each', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(docChildren.length).toEqual(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren.length).toEqual(4);
        expect(shipOrderChildren[3].title).toEqual('Item');
        VisualizationService.applyForEach(shipOrderChildren[3] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[3].title).toEqual('for-each');
        const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[3]);
        expect(forEachChildren.length).toEqual(1);
        expect(forEachChildren[0].title).toEqual('Item');
      });
    });

    describe('applyValueSelector()', () => {
      it('should apply value selector', () => {
        expect(tree.children.length).toEqual(0);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        VisualizationService.applyValueSelector(docChildren[0] as TargetNodeData);

        expect(tree.children.length).toEqual(1);
        expect(tree.children[0].children[0] instanceof ValueSelector).toBeTruthy();
      });

      it('should apply value selector on primitive target body', () => {
        const primitiveTargetDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        tree = new MappingTree(
          primitiveTargetDoc.documentType,
          primitiveTargetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        targetDocNode = new TargetDocumentNodeData(primitiveTargetDoc, tree);
        VisualizationService.applyValueSelector(targetDocNode);

        expect(VisualizationService.hasChildren(targetDocNode)).toBeFalsy();
        const targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        expect(targetDocChildren.length).toEqual(0);
      });
    });

    describe('getExpressionItemForNode()', () => {
      it('should return ValueSelector for primitive target body', () => {
        const primitiveTargetDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        tree = new MappingTree(
          primitiveTargetDoc.documentType,
          primitiveTargetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        targetDocNode = new TargetDocumentNodeData(primitiveTargetDoc, tree);
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
        VisualizationService.engageMapping(tree, sourceShipOrderChildren[1] as FieldNodeData, targetDocNode);

        const expressionItem = VisualizationService.getExpressionItemForNode(targetDocNode);
        expect(expressionItem?.expression).toEqual('/ns0:ShipOrder/ns0:OrderPerson');
      });
    });

    describe('deleteMappingItem()', () => {
      it('should delete primitive target body mapping', () => {
        const primitiveTargetDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        tree = new MappingTree(
          primitiveTargetDoc.documentType,
          primitiveTargetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        targetDocNode = new TargetDocumentNodeData(primitiveTargetDoc, tree);
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
        VisualizationService.engageMapping(tree, sourceShipOrderChildren[1] as FieldNodeData, targetDocNode);

        VisualizationService.deleteMappingItem(targetDocNode);
        const expressionItem = VisualizationService.getExpressionItemForNode(targetDocNode);
        expect(expressionItem).toBeUndefined();
      });
    });

    describe('engageMapping()', () => {
      it('should engage mapping to a MappingItem', () => {
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
        let targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        VisualizationService.applyIf(targetShipOrderChildren[1] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const ifItem = tree.children[0].children[0] as IfItem;
        expect(ifItem.expression).toEqual('');
        VisualizationService.engageMapping(
          tree,
          sourceShipOrderChildren[1] as FieldNodeData,
          targetShipOrderChildren[1] as TargetNodeData,
        );

        expect(ifItem.expression).toEqual('/ns0:ShipOrder/ns0:OrderPerson');
      });

      it('should engage mapping to a Document', () => {
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        expect(tree.children.length).toEqual(0);
        VisualizationService.engageMapping(tree, sourceDocChildren[0] as FieldNodeData, targetDocNode);

        expect(tree.children[0] instanceof ValueSelector).toBeTruthy();
        const selector = tree.children[0] as ValueSelector;
        expect(selector.expression).toEqual('/ns0:ShipOrder');
      });

      it('should engage mapping to a field', () => {
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(tree.children.length).toEqual(0);
        VisualizationService.engageMapping(
          tree,
          sourceShipOrderChildren[1] as FieldNodeData,
          targetShipOrderChildren[1] as TargetNodeData,
        );

        expect(tree.children[0] instanceof FieldItem).toBeTruthy();
        expect(tree.children[0].children[0] instanceof FieldItem).toBeTruthy();
        expect(tree.children[0].children[0].children[0] instanceof ValueSelector).toBeTruthy();
        const selector = tree.children[0].children[0].children[0] as ValueSelector;
        expect(selector.expression).toEqual('/ns0:ShipOrder/ns0:OrderPerson');
      });

      it("should engage regular mapping even if it's dropped to a for-each wrapped collection field", () => {
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
        const sourceItem = sourceShipOrderChildren[3] as FieldNodeData;
        let targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const targetItem = targetShipOrderChildren[3] as TargetFieldNodeData;
        VisualizationService.applyForEach(targetItem);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const forEach = targetShipOrderChildren[3] as MappingNodeData;
        const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEach);
        VisualizationService.engageMapping(tree, sourceItem, forEachChildren[0] as TargetFieldNodeData);

        expect((forEach.mapping as ForEachItem).expression).toEqual('');
        expect(((forEachChildren[0] as FieldItemNodeData).mapping.children[0] as ValueSelector).expression).toEqual(
          '/ns0:ShipOrder/Item',
        );
      });

      it('should not remove for-each targeted field item when selector is removed', () => {
        MappingSerializerService.deserialize(getShipOrderToShipOrderInvalidForEachXslt(), targetDoc, tree, paramsMap);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        let targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        let forEachItem = (targetShipOrderChildren[3] as MappingNodeData).mapping as ForEachItem;
        expect(forEachItem.children.length).toEqual(1);
        expect(forEachItem.expression).toEqual('');
        let targetForEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          targetShipOrderChildren[3],
        );
        let itemItem = targetForEachChildren[0] as TargetFieldNodeData;
        expect((itemItem.mapping?.children[0] as ValueSelector).expression).toEqual('/ns0:ShipOrder/Item');
        VisualizationService.deleteMappingItem(targetForEachChildren[0] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        forEachItem = (targetShipOrderChildren[3] as MappingNodeData).mapping as ForEachItem;
        expect(forEachItem).toBeDefined();
        expect(forEachItem.children.length).toEqual(1);
        expect(forEachItem.expression).toEqual('');
        targetForEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetShipOrderChildren[3]);
        itemItem = targetForEachChildren[0] as TargetFieldNodeData;
        expect(itemItem.mapping).toBeDefined();
        expect(itemItem.mapping?.children.length).toEqual(0);
      });

      it('should not remove for-each targeted field item when descendent is removed', () => {
        MappingSerializerService.deserialize(getShipOrderToShipOrderInvalidForEachXslt(), targetDoc, tree, paramsMap);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        let targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        let targetForEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          targetShipOrderChildren[3],
        );
        let targetItemChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetForEachChildren[0]);
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
        const sourceItemChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceShipOrderChildren[3]);
        VisualizationService.deleteMappingItem(targetForEachChildren[0] as TargetNodeData);
        VisualizationService.engageMapping(
          tree,
          sourceItemChildren[0] as FieldNodeData,
          targetItemChildren[0] as TargetFieldNodeData,
        );

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        targetForEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetShipOrderChildren[3]);
        targetItemChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetForEachChildren[0]);
        expect(
          ((targetItemChildren[0] as TargetFieldNodeData).mapping?.children[0] as ValueSelector).expression,
        ).toEqual('/ns0:ShipOrder/Item/Title');
        VisualizationService.deleteMappingItem(targetItemChildren[0] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const forEachItem = (targetShipOrderChildren[3] as MappingNodeData).mapping as ForEachItem;
        expect(forEachItem).toBeDefined();
        expect(forEachItem.children.length).toEqual(1);
        expect(forEachItem.expression).toEqual('');
        targetForEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetShipOrderChildren[3]);
        targetItemChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetForEachChildren[0]);
        expect((targetItemChildren[0] as TargetFieldNodeData).mapping?.children[0] as ValueSelector).toBeUndefined();
      });

      it('should generate correct XPath for fields with xs:extension', () => {
        const adtInDocResult = TestUtil.createAdtInDoc();
        const adtOutDocResult = TestUtil.createAdtOutDoc();
        const adtTree = new MappingTree(
          adtOutDocResult.document!.documentType,
          adtOutDocResult.document!.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const adtInDocNode = new DocumentNodeData(adtInDocResult.document!);
        const adtOutDocNode = new TargetDocumentNodeData(adtOutDocResult.document!, adtTree);

        const hl7Children = VisualizationService.generateStructuredDocumentChildren(adtInDocNode);
        const hl7Node = hl7Children[0];
        const hl7SubChildren = VisualizationService.generateNonDocumentNodeDataChildren(hl7Node) as FieldNodeData[];
        const pidNode = hl7SubChildren.find((child) => child.field?.name === 'PID');
        expect(pidNode).toBeDefined();

        const pidChildren = VisualizationService.generateNonDocumentNodeDataChildren(pidNode!) as FieldNodeData[];
        const field01Node = pidChildren.find((child) => child.field?.name === 'field_01');
        expect(field01Node).toBeDefined();

        const field01Children = VisualizationService.generateNonDocumentNodeDataChildren(
          field01Node!,
        ) as FieldNodeData[];
        const comp02Node = field01Children.find((child) => child.field?.name === 'comp_02');
        expect(comp02Node).toBeDefined();

        VisualizationService.engageMapping(adtTree, comp02Node as FieldNodeData, adtOutDocNode);

        const expressionItem = VisualizationService.getExpressionItemForNode(adtOutDocNode);
        expect(expressionItem?.expression).toEqual('/HL7/PID/field_01/comp_02');
      });

      it('should generate correct XPath for attributes with xs:extension', () => {
        const extensionSimpleDef = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          BODY_DOCUMENT_ID,
          { 'ExtensionSimple.xsd': getExtensionSimpleXsd() },
        );
        const sourceDocResult = XmlSchemaDocumentService.createXmlSchemaDocument(extensionSimpleDef);
        const targetDocResult = XmlSchemaDocumentService.createXmlSchemaDocument(extensionSimpleDef);
        const tree = new MappingTree(
          targetDocResult.document!.documentType,
          targetDocResult.document!.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const sourceDocNode = new DocumentNodeData(sourceDocResult.document!);
        const targetDocNode = new TargetDocumentNodeData(targetDocResult.document!, tree);

        const productChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const productNode = productChildren[0];
        const productSubChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          productNode,
        ) as FieldNodeData[];
        const priceNode = productSubChildren.find((child) => child.field?.name === 'price');
        expect(priceNode).toBeDefined();

        const priceChildren = VisualizationService.generateNonDocumentNodeDataChildren(priceNode!) as FieldNodeData[];
        const currencyAttr = priceChildren.find(
          (child) => child.field?.name === 'currency' && child.field?.isAttribute,
        );
        expect(currencyAttr).toBeDefined();

        VisualizationService.engageMapping(tree, currencyAttr as FieldNodeData, targetDocNode);

        const expressionItem = VisualizationService.getExpressionItemForNode(targetDocNode);
        expect(expressionItem?.expression).toEqual('/ns0:Product/ns0:price/@currency');
      });
    });
    it('should fill ContextItemExpr (.) and AbbrevReverseStep (..) in xpath when it maps under for-each', () => {
      const orgDefinition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'Org', {
        'Org.xsd': getOrgXsd(),
      });
      const orgResult = XmlSchemaDocumentService.createXmlSchemaDocument(orgDefinition);
      expect(orgResult.validationStatus).toBe('success');
      const orgDoc = orgResult.document!;
      const contactsDefinition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'Contacts.xsd': getContactsXsd() },
      );
      const contactsResult = XmlSchemaDocumentService.createXmlSchemaDocument(contactsDefinition);
      expect(contactsResult.validationStatus).toBe('success');
      const contactsDoc = contactsResult.document!;

      const orgToContactsTree = new MappingTree(
        contactsDoc.documentType,
        contactsDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const orgSourceNode = new DocumentNodeData(orgDoc);
      const targetContactsNode = new TargetDocumentNodeData(contactsDoc, orgToContactsTree);

      const orgSourceChildren = VisualizationService.generateStructuredDocumentChildren(orgSourceNode);
      const orgChildren = VisualizationService.generateNonDocumentNodeDataChildren(orgSourceChildren[0]);
      const orgNameField = orgChildren.find((f) => f.title === 'Name') as FieldNodeData;
      const personChildren = VisualizationService.generateNonDocumentNodeDataChildren(
        orgChildren.find((f) => f.title === 'Person') as FieldNodeData,
      );
      const personNameField = personChildren.find((f) => f.title === 'Name') as FieldNodeData;
      const emailField = personChildren.find((f) => f.title === 'Email') as FieldNodeData; // Email field

      let targetContactsChildren = VisualizationService.generateStructuredDocumentChildren(targetContactsNode);
      let contactsChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetContactsChildren[0]);

      const targetContactField = contactsChildren[0] as TargetFieldNodeData; // Contact field
      VisualizationService.applyForEach(targetContactField);

      targetContactsChildren = VisualizationService.generateStructuredDocumentChildren(targetContactsNode);
      contactsChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetContactsChildren[0]);
      VisualizationService.engageMapping(orgToContactsTree, emailField, contactsChildren[0] as TargetNodeData);

      targetContactsChildren = VisualizationService.generateStructuredDocumentChildren(targetContactsNode);
      contactsChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetContactsChildren[0]);
      let targetForEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(contactsChildren[0]);
      let targetContactChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetForEachChildren[0]);

      let targetOrgNameField = targetContactChildren.find(
        (child) => (child as TargetFieldNodeData).field?.name === 'OrgName',
      ) as TargetFieldNodeData;
      VisualizationService.engageMapping(orgToContactsTree, orgNameField, targetOrgNameField);
      let targetPersonNameField = targetContactChildren.find(
        (child) => (child as TargetFieldNodeData).field?.name === 'PersonName',
      ) as TargetFieldNodeData;
      VisualizationService.engageMapping(orgToContactsTree, personNameField, targetPersonNameField);
      let targetEmailField = targetContactChildren.find(
        (child) => (child as TargetFieldNodeData).field?.name === 'Email',
      ) as TargetFieldNodeData;
      VisualizationService.engageMapping(orgToContactsTree, emailField, targetEmailField);

      targetContactsChildren = VisualizationService.generateStructuredDocumentChildren(targetContactsNode);
      contactsChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetContactsChildren[0]);
      targetForEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(contactsChildren[0]);
      targetContactChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetForEachChildren[0]);

      targetOrgNameField = targetContactChildren.find(
        (child) => (child as TargetFieldNodeData).field?.name === 'OrgName',
      ) as TargetFieldNodeData;
      expect(targetOrgNameField.mapping).toBeDefined();
      let valueSelector = targetOrgNameField.mapping?.children[0] as ValueSelector;
      expect(valueSelector).toBeDefined();
      expect(valueSelector.expression).toEqual('../../Name');

      targetPersonNameField = targetContactChildren.find(
        (child) => (child as TargetFieldNodeData).field?.name === 'PersonName',
      ) as TargetFieldNodeData;
      expect(targetPersonNameField.mapping).toBeDefined();
      valueSelector = targetPersonNameField.mapping?.children[0] as ValueSelector;
      expect(valueSelector).toBeDefined();
      expect(valueSelector.expression).toEqual('../Name');

      targetEmailField = targetContactChildren.find(
        (child) => (child as TargetFieldNodeData).field?.name === 'Email',
      ) as TargetFieldNodeData;
      expect(targetEmailField.mapping).toBeDefined();
      valueSelector = targetEmailField.mapping?.children[0] as ValueSelector;
      expect(valueSelector).toBeDefined();
      expect(valueSelector.expression).toEqual('.');
    });
  });

  describe('with pre-populated mappings', () => {
    beforeEach(() => {
      MappingSerializerService.deserialize(getShipOrderToShipOrderXslt(), targetDoc, tree, paramsMap);
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    describe('getAllowedActions() if/choose', () => {
      it('should test if or choose is allowed', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        expect(MappingActionService.getAllowedActions(targetDocNode)).toContain(MappingActionKind.If);
        expect(MappingActionService.getAllowedActions(targetDocNode)).toContain(MappingActionKind.Choose);
        expect(MappingActionService.getAllowedActions(targetDocChildren[0] as TargetNodeData)).toContain(
          MappingActionKind.If,
        );
        expect(MappingActionService.getAllowedActions(targetDocChildren[0] as TargetNodeData)).toContain(
          MappingActionKind.Choose,
        );
        expect(MappingActionService.getAllowedActions(shipOrderChildren[1] as TargetNodeData)).not.toContain(
          MappingActionKind.If,
        );
        expect(MappingActionService.getAllowedActions(shipOrderChildren[1] as TargetNodeData)).not.toContain(
          MappingActionKind.Choose,
        );
      });
    });

    describe('deleteMappingItem()', () => {
      it('should delete', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(shipOrderChildren[1] instanceof MappingNodeData).toBeTruthy();
        VisualizationService.deleteMappingItem(shipOrderChildren[1] as TargetNodeData);

        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(shipOrderChildren[1] instanceof TargetFieldNodeData).toBeTruthy();
      });
    });

    describe('getAllowedActions()', () => {
      it('should include ContextMenu for appropriate nodes', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(MappingActionService.getAllowedActions(targetDocNode)).toContain(MappingActionKind.ContextMenu);
        expect(MappingActionService.getAllowedActions(targetDocChildren[0] as TargetNodeData)).toContain(
          MappingActionKind.ContextMenu,
        );

        expect(shipOrderChildren.length).toEqual(5);
        const orderIdNode = shipOrderChildren[0] as FieldItemNodeData;
        expect(orderIdNode.title).toEqual('OrderId');
        expect(MappingActionService.getAllowedActions(orderIdNode)).toContain(MappingActionKind.ContextMenu);

        const ifNode = shipOrderChildren[1] as MappingNodeData;
        expect(ifNode.title).toEqual('if');
        expect(MappingActionService.getAllowedActions(ifNode)).toContain(MappingActionKind.ContextMenu);

        const shipToNode = shipOrderChildren[2] as TargetFieldNodeData;
        expect(shipToNode.title).toEqual('ShipTo');
        expect(MappingActionService.getAllowedActions(shipToNode)).toContain(MappingActionKind.ContextMenu);

        const forEachNode = shipOrderChildren[3] as MappingNodeData;
        expect(forEachNode.title).toEqual('for-each');
        expect(MappingActionService.getAllowedActions(forEachNode)).not.toContain(MappingActionKind.ContextMenu);

        expect(shipOrderChildren[4] instanceof AddMappingNodeData).toBeTruthy();
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(addMappingNode.title).toEqual('Item');
        expect(addMappingNode.id).toContain('add-mapping-fx-Item');
        expect(MappingActionService.getAllowedActions(addMappingNode)).toContain(MappingActionKind.ForEach);
        expect(MappingActionService.getAllowedActions(addMappingNode)).toContain(MappingActionKind.If);
        expect(MappingActionService.getAllowedActions(addMappingNode)).toContain(MappingActionKind.Choose);
        expect(MappingActionService.getAllowedActions(addMappingNode)).toContain(MappingActionKind.ContextMenu);
        expect(MappingActionService.getAllowedActions(addMappingNode)).not.toContain(MappingActionKind.ValueSelector);
      });
    });

    describe('addMapping()', () => {
      it('should add an empty mapping', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(shipOrderChildren.length).toEqual(5);

        const shipOrderMappingItem = targetDocNode.mappingTree.children[0];

        expect(shipOrderChildren[4] instanceof AddMappingNodeData).toBeTruthy();
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(shipOrderMappingItem.children.length).toEqual(4);
        VisualizationService.addMapping(addMappingNode);

        expect(shipOrderMappingItem.children.length).toEqual(5);
        expect(shipOrderMappingItem.children[4] instanceof FieldItem).toBeTruthy();
        const itemItem = shipOrderMappingItem.children[4] as FieldItem;
        expect(itemItem.field.name).toEqual('Item');
      });
    });

    describe('applyIf() on AddMappingNodeData', () => {
      it('should wrap with if when applied to an AddMappingNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(shipOrderChildren.length).toEqual(5);

        expect(shipOrderChildren[4] instanceof AddMappingNodeData).toBeTruthy();
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(addMappingNode.title).toEqual('Item');

        const shipOrderMappingItem = targetDocNode.mappingTree.children[0];
        const childCountBefore = shipOrderMappingItem.children.length;

        VisualizationService.applyIf(addMappingNode);

        expect(shipOrderMappingItem.children.length).toEqual(childCountBefore + 1);
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
        expect(ifChildren.length).toEqual(1);
        expect(ifChildren[0].title).toEqual('Item');
      });
    });

    describe('applyChooseWhenOtherwise() on AddMappingNodeData', () => {
      it('should wrap with choose-when-otherwise when applied to an AddMappingNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(shipOrderChildren.length).toEqual(5);

        expect(shipOrderChildren[4] instanceof AddMappingNodeData).toBeTruthy();
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(addMappingNode.title).toEqual('Item');

        const shipOrderMappingItem = targetDocNode.mappingTree.children[0];
        const childCountBefore = shipOrderMappingItem.children.length;

        VisualizationService.applyChooseWhenOtherwise(addMappingNode);

        expect(shipOrderMappingItem.children.length).toEqual(childCountBefore + 1);
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
        expect(chooseChildren.length).toEqual(2);
        expect(chooseChildren[0].title).toEqual('when');
        expect(chooseChildren[1].title).toEqual('otherwise');
      });
    });
  });

  describe('getAllowedActions() delete', () => {
    it('should identify deletable nodes', () => {
      MappingSerializerService.deserialize(getConditionalMappingsToShipOrderXslt(), targetDoc, tree, paramsMap);
      const docData = new TargetDocumentNodeData(targetDoc, tree);

      const fieldNodeData = new FieldItemNodeData(docData, tree.children[0] as FieldItem);
      expect(MappingActionService.getAllowedActions(fieldNodeData)).not.toContain(MappingActionKind.Delete);

      const forEachNodeData = new MappingNodeData(docData, tree.children[0].children[0] as ForEachItem);
      expect(MappingActionService.getAllowedActions(forEachNodeData)).toContain(MappingActionKind.Delete);

      const valueSelectorNodeData = new MappingNodeData(
        docData,
        tree.children[0].children[0].children[0] as ValueSelector,
      );
      expect(MappingActionService.getAllowedActions(valueSelectorNodeData)).toContain(MappingActionKind.Delete);
    });
  });

  describe('choice field mappings', () => {
    function createMockChoiceField(members: { name: string }[], selectedMemberIndex?: number) {
      const baseField = sourceDoc.fields[0];
      const memberFields = members.map((m) => ({
        ...baseField,
        name: m.name,
        displayName: m.name,
        fields: [],
        isChoice: false,
      }));
      return {
        ...baseField,
        name: '__choice__',
        displayName: 'choice',
        isChoice: true,
        selectedMemberIndex,
        fields: memberFields,
      } as unknown as typeof baseField;
    }

    describe('engageMapping with choice source', () => {
      let localTargetDocNode: TargetDocumentNodeData;

      beforeEach(() => {
        localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      });

      it('should create ChooseItem with WhenItems and OtherwiseItem for choice source with 2 members', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
        const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
        const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

        VisualizationService.engageMapping(tree, choiceNode, targetFieldNode);

        expect(tree.children.length).toEqual(1);
        const targetFieldItem = tree.children[0];
        expect(targetFieldItem).toBeInstanceOf(FieldItem);
        expect(targetFieldItem.children.length).toEqual(1);

        const chooseItem = targetFieldItem.children[0] as ChooseItem;
        expect(chooseItem).toBeInstanceOf(ChooseItem);
        expect(chooseItem.when.length).toEqual(2);
        expect(chooseItem.otherwise).toBeInstanceOf(OtherwiseItem);
      });

      it('each WhenItem expression should be the XPath of the corresponding choice member', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
        const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
        const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

        VisualizationService.engageMapping(tree, choiceNode, targetFieldNode);

        const chooseItem = tree.children[0].children[0] as ChooseItem;
        expect(chooseItem.when[0].expression).toEqual('/ns0:email');
        expect(chooseItem.when[1].expression).toEqual('/ns0:phone');
      });

      it('each WhenItem ValueSelector expression should be the XPath of the corresponding choice member', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
        const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
        const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

        VisualizationService.engageMapping(tree, choiceNode, targetFieldNode);

        const chooseItem = tree.children[0].children[0] as ChooseItem;
        const emailSelector = chooseItem.when[0].children.find((c) => c instanceof ValueSelector) as ValueSelector;
        const phoneSelector = chooseItem.when[1].children.find((c) => c instanceof ValueSelector) as ValueSelector;
        expect(emailSelector.expression).toEqual('/ns0:email');
        expect(phoneSelector.expression).toEqual('/ns0:phone');
      });

      it('should create ChooseItem when dropping choice source onto an existing FieldItemNodeData target', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
        const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);

        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(localTargetDocNode);
        VisualizationService.engageMapping(
          tree,
          sourceDocChildren[0] as FieldNodeData,
          targetDocChildren[0] as TargetNodeData,
        );

        const updatedTargetDocChildren = VisualizationService.generateStructuredDocumentChildren(localTargetDocNode);
        const fieldItemNode = updatedTargetDocChildren[0] as FieldItemNodeData;
        expect(fieldItemNode).toBeInstanceOf(FieldItemNodeData);

        const valueSelectorBefore = fieldItemNode.mapping.children.some((c) => c instanceof ValueSelector);
        expect(valueSelectorBefore).toBe(true);

        VisualizationService.engageMapping(tree, choiceNode, fieldItemNode);

        const chooseItem = fieldItemNode.mapping.children.find((c) => c instanceof ChooseItem) as ChooseItem;
        expect(chooseItem).toBeInstanceOf(ChooseItem);
        expect(chooseItem.when.length).toEqual(2);
        expect(chooseItem.otherwise).toBeInstanceOf(OtherwiseItem);
        const valueSelectorAfter = fieldItemNode.mapping.children.some((c) => c instanceof ValueSelector);
        expect(valueSelectorAfter).toBe(false);
      });

      it('should create ChooseItem with only OtherwiseItem for empty-member choice source', () => {
        const choiceField = createMockChoiceField([]);
        const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
        const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

        VisualizationService.engageMapping(tree, choiceNode, targetFieldNode);

        const chooseItem = tree.children[0].children[0] as ChooseItem;
        expect(chooseItem).toBeInstanceOf(ChooseItem);
        expect(chooseItem.when.length).toEqual(0);
        expect(chooseItem.otherwise).toBeInstanceOf(OtherwiseItem);
      });

      it('should create a simple field mapping when dragging a selected choice member', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 0);
        const selectedMember = choiceField.fields[0];
        const choiceNode = new ChoiceFieldNodeData(
          sourceDocNode,
          selectedMember as unknown as (typeof sourceDoc.fields)[0],
        );
        choiceNode.choiceField = choiceField;
        const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

        VisualizationService.engageMapping(tree, choiceNode, targetFieldNode);

        expect(tree.children.length).toEqual(1);
        const targetFieldItem = tree.children[0];
        expect(targetFieldItem).toBeInstanceOf(FieldItem);
        expect(targetFieldItem.children.length).toEqual(1);
        expect(targetFieldItem.children[0]).toBeInstanceOf(ValueSelector);
        expect(targetFieldItem.children[0]).not.toBeInstanceOf(ChooseItem);
      });

      it('should not create duplicate ChooseItem when mapping the same choice source twice', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
        const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
        const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

        VisualizationService.engageMapping(tree, choiceNode, targetFieldNode);
        VisualizationService.engageMapping(tree, choiceNode, targetFieldNode);

        const targetFieldItem = tree.children[0];
        const chooseItems = targetFieldItem.children.filter((c) => c instanceof ChooseItem);
        expect(chooseItems.length).toEqual(1);
      });
    });

    describe('mapping through unselected target choice wrapper', () => {
      let localTargetDocNode: TargetDocumentNodeData;
      let parentFieldNode: TargetFieldNodeData;
      let choiceField: ReturnType<typeof createMockChoiceField>;

      beforeEach(() => {
        localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        choiceField = createMockChoiceField([{ name: 'contactEmail' }, { name: 'contactPhone' }]);
        const parentField = {
          ...targetDoc.fields[0],
          fields: [choiceField],
        };
        parentFieldNode = new TargetFieldNodeData(localTargetDocNode, parentField as (typeof targetDoc.fields)[0]);
      });

      it('getOrCreateFieldItem should skip unselected choice wrapper and create FieldItem under grandparent', () => {
        // Build the node hierarchy: parentField -> choiceWrapper -> memberField
        const choiceNode = new TargetChoiceFieldNodeData(parentFieldNode, choiceField);
        // choiceField property is undefined = unselected wrapper
        expect(choiceNode.choiceField).toBeUndefined();

        const memberField = choiceField.fields[0];
        const memberNode = new TargetFieldNodeData(choiceNode, memberField);

        // engageMapping triggers getOrCreateFieldItem for the member inside the choice wrapper
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
        const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

        VisualizationService.engageMapping(tree, sourceChildren[0] as FieldNodeData, memberNode);

        // The mapping tree should have the member's FieldItem directly under the parent FieldItem,
        // not under a spurious choice wrapper FieldItem.
        const parentItem = tree.children[0]; // FieldItem for parentField (e.g. ShipOrder)
        expect(parentItem).toBeInstanceOf(FieldItem);
        const memberItem = parentItem.children.find(
          (c) => c instanceof FieldItem && c.field === memberField,
        ) as FieldItem;
        expect(memberItem).toBeDefined();
        expect(memberItem.field.name).toEqual('contactEmail');
      });

      it('generateNonDocumentNodeDataChildren should find mappings for fields inside unselected choice wrapper', () => {
        // First create a mapping for a member field inside the choice wrapper
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
        const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

        // Build the node hierarchy and engage mapping
        const choiceNode = new TargetChoiceFieldNodeData(parentFieldNode, choiceField);
        const memberField = choiceField.fields[0];
        const memberNode = new TargetFieldNodeData(choiceNode, memberField);

        VisualizationService.engageMapping(tree, sourceChildren[0] as FieldNodeData, memberNode);

        // Now regenerate the target tree from scratch and verify the choice wrapper children
        // resolve the existing mapping correctly
        const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const freshParentField = {
          ...targetDoc.fields[0],
          fields: [choiceField],
        };
        const freshParentNode = new TargetFieldNodeData(
          freshTargetDocNode,
          freshParentField as (typeof targetDoc.fields)[0],
        );
        // parentField should have a mapping now
        freshParentNode.mapping = tree.children[0] as FieldItem;

        const freshChoiceNode = new TargetChoiceFieldNodeData(freshParentNode, choiceField);
        // Unselected wrapper — choiceField property is undefined
        const choiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshChoiceNode);

        // The member 'contactEmail' should be rendered as a FieldItemNodeData (has mapping),
        // not as a plain TargetFieldNodeData (no mapping found)
        const contactEmailNode = choiceChildren.find((c) => c.title === 'contactEmail');
        expect(contactEmailNode).toBeDefined();
        expect(contactEmailNode).toBeInstanceOf(FieldItemNodeData);
      });

      it('FieldItemNodeData.path should include choice wrapper segment while FieldItem.nodePath should not', () => {
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
        const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

        const choiceNode = new TargetChoiceFieldNodeData(parentFieldNode, choiceField);
        const memberField = choiceField.fields[0];
        const memberNode = new TargetFieldNodeData(choiceNode, memberField);

        VisualizationService.engageMapping(tree, sourceChildren[0] as FieldNodeData, memberNode);

        const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const parentItem = tree.children[0] as FieldItem;
        const freshParentNode = new FieldItemNodeData(freshTargetDocNode, parentItem);
        freshParentNode.field = {
          ...freshParentNode.field,
          fields: [choiceField],
        } as typeof freshParentNode.field;

        const freshChoiceNode = new TargetChoiceFieldNodeData(freshParentNode, choiceField);
        const choiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshChoiceNode);
        const contactEmailNode = choiceChildren.find((c) => c.title === 'contactEmail') as FieldItemNodeData;

        const mappingFieldItem = parentItem.children.find(
          (c) => c instanceof FieldItem && c.field === memberField,
        ) as FieldItem;
        // Visual path includes choice wrapper segment; mapping path does not.
        // MappingLinksService.computeVisualTargetNodePath bridges this gap for line rendering.
        expect(contactEmailNode.path.pathSegments).toContain(choiceField.id);
        expect(mappingFieldItem.nodePath.pathSegments).not.toContain(choiceField.id);
      });

      it('should work for nested fields inside choice member (mapping + rendering + path)', () => {
        // Create a choice field where the member has nested children
        const baseField = sourceDoc.fields[0];
        const nestedField = {
          ...baseField,
          name: 'emailAddress',
          displayName: 'emailAddress',
          fields: [] as unknown[],
          isChoice: false,
        } as unknown as typeof baseField;
        const memberWithChildren = {
          ...baseField,
          name: 'contactEmail',
          displayName: 'contactEmail',
          fields: [nestedField],
          isChoice: false,
        } as unknown as typeof baseField;
        (nestedField as unknown as Record<string, unknown>).parent = memberWithChildren;
        const nestedChoiceField = {
          ...baseField,
          name: 'choice',
          displayName: 'choice',
          isChoice: true,
          selectedMemberIndex: undefined,
          fields: [memberWithChildren],
        } as unknown as typeof baseField;

        const nestedParentField = {
          ...targetDoc.fields[0],
          fields: [nestedChoiceField],
        };
        const nestedParentNode = new TargetFieldNodeData(
          localTargetDocNode,
          nestedParentField as (typeof targetDoc.fields)[0],
        );

        // Build the visual tree: parent → choice → contactEmail → emailAddress
        const nestedChoiceNode = new TargetChoiceFieldNodeData(nestedParentNode, nestedChoiceField);
        const contactEmailNode = new TargetFieldNodeData(nestedChoiceNode, memberWithChildren);
        const emailAddressNode = new TargetFieldNodeData(contactEmailNode, nestedField);

        // Map source to the nested emailAddress field
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
        const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

        VisualizationService.engageMapping(tree, sourceChildren[0] as FieldNodeData, emailAddressNode);

        // Verify mapping tree structure: parent → contactEmail → emailAddress
        const parentItem = tree.children[0] as FieldItem;
        expect(parentItem).toBeInstanceOf(FieldItem);
        const contactEmailItem = parentItem.children.find(
          (c) => c instanceof FieldItem && c.field === memberWithChildren,
        ) as FieldItem;
        expect(contactEmailItem).toBeDefined();
        const emailAddressItem = contactEmailItem.children.find(
          (c) => c instanceof FieldItem && c.field === nestedField,
        ) as FieldItem;
        expect(emailAddressItem).toBeDefined();

        // Verify ValueSelector was created with an expression
        const valueSelector = emailAddressItem.children.find((c) => c instanceof ValueSelector) as ValueSelector;
        expect(valueSelector).toBeDefined();
        expect(valueSelector.expression).not.toEqual('');

        // Re-render using FieldItemNodeData for the parent (realistic rendering)
        const freshTargetDocNode2 = new TargetDocumentNodeData(targetDoc, tree);
        const freshParentNode2 = new FieldItemNodeData(freshTargetDocNode2, parentItem);
        freshParentNode2.field = {
          ...freshParentNode2.field,
          fields: [nestedChoiceField],
        } as typeof freshParentNode2.field;

        const freshChoiceNode2 = new TargetChoiceFieldNodeData(freshParentNode2, nestedChoiceField);
        const freshChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshChoiceNode2);

        // contactEmail should be found as FieldItemNodeData
        const freshContactEmailNode = freshChoiceChildren.find((c) => c.title === 'contactEmail') as FieldItemNodeData;
        expect(freshContactEmailNode).toBeInstanceOf(FieldItemNodeData);

        // Expand contactEmail — emailAddress should be found as FieldItemNodeData
        const contactEmailChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshContactEmailNode);
        const freshEmailAddressNode = contactEmailChildren.find((c) => c.title === 'emailAddress');
        expect(freshEmailAddressNode).toBeDefined();
        expect(freshEmailAddressNode).toBeInstanceOf(FieldItemNodeData);

        // Visual path includes choice wrapper segment; mapping path does not.
        // MappingLinksService.computeVisualTargetNodePath bridges this gap for line rendering.
        expect((freshEmailAddressNode as FieldItemNodeData).path.pathSegments).toContain(nestedChoiceField.id);
        expect(emailAddressItem.nodePath.pathSegments).not.toContain(nestedChoiceField.id);
      });
    });

    describe('nested choice wrappers (choice inside choice)', () => {
      it('should map to a field inside a nested choice and render the mapping correctly', () => {
        // Use TestDocument.xsd which has DirectNestedChoiceElement:
        //   <xs:choice>
        //     <xs:element name="Direct1"/>
        //     <xs:choice>
        //       <xs:element name="NestedDirect1"/>
        //       <xs:element name="NestedDirect2"/>
        //     </xs:choice>
        //   </xs:choice>
        const definition = new DocumentDefinition(
          DocumentType.TARGET_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          BODY_DOCUMENT_ID,
          { 'testDocument.xsd': getTestDocumentXsd() },
        );
        const testTargetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(definition).document!;
        const testTree = new MappingTree(
          testTargetDoc.documentType,
          testTargetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const testTargetDocNode = new TargetDocumentNodeData(testTargetDoc, testTree);

        // Navigate to DirectNestedChoiceElement
        const docChildren = VisualizationService.generateStructuredDocumentChildren(testTargetDocNode);
        const testDocumentNode = docChildren[0];
        const testDocumentChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentNode);
        // DirectNestedChoiceElement is the 3rd child (index 2) after ChoiceElement, SiblingChoicesElement
        const directNestedNode = testDocumentChildren.find((c) => c.title === 'DirectNestedChoiceElement')!;
        const directNestedChildren = VisualizationService.generateNonDocumentNodeDataChildren(directNestedNode);

        // Should have one outer choice wrapper
        expect(directNestedChildren.length).toEqual(1);
        const outerChoice = directNestedChildren[0] as TargetChoiceFieldNodeData;
        expect(outerChoice).toBeInstanceOf(TargetChoiceFieldNodeData);

        // Expand outer choice: [Direct1, inner_choice]
        const outerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerChoice);
        expect(outerChoiceChildren[0].title).toEqual('Direct1');
        const innerChoice = outerChoiceChildren.find(
          (c) => c instanceof TargetChoiceFieldNodeData,
        ) as TargetChoiceFieldNodeData;
        expect(innerChoice).toBeDefined();

        // Expand inner choice: [NestedDirect1, NestedDirect2]
        const innerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(innerChoice);
        const nestedDirect1 = innerChoiceChildren.find((c) => c.title === 'NestedDirect1')! as TargetFieldNodeData;
        expect(nestedDirect1).toBeDefined();

        // Map source field to NestedDirect1 inside the nested choice
        const sourceDocChildren2 = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceFieldNode2 = sourceDocChildren2[0] as FieldNodeData;
        const sourceChildren2 = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode2);
        VisualizationService.engageMapping(testTree, sourceChildren2[0] as FieldNodeData, nestedDirect1);

        // Verify mapping tree: TestDocument → DirectNestedChoiceElement → NestedDirect1
        // (both choice wrappers skipped)
        const testDocItem = testTree.children[0] as FieldItem;
        expect(testDocItem).toBeInstanceOf(FieldItem);
        const directNestedItem = testDocItem.children.find(
          (c) => c instanceof FieldItem && c.field.name === 'DirectNestedChoiceElement',
        ) as FieldItem;
        expect(directNestedItem).toBeDefined();
        const nestedDirect1Item = directNestedItem.children.find(
          (c) => c instanceof FieldItem && c.field.name === 'NestedDirect1',
        ) as FieldItem;
        expect(nestedDirect1Item).toBeDefined();

        // Re-render from scratch and verify nested field is found with correct path
        const freshDocNode = new TargetDocumentNodeData(testTargetDoc, testTree);
        const freshDocChildren = VisualizationService.generateStructuredDocumentChildren(freshDocNode);
        const freshTestDocNode = freshDocChildren[0];
        const freshTestDocChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshTestDocNode);
        const freshDirectNestedNode = freshTestDocChildren.find(
          (c) => c.title === 'DirectNestedChoiceElement',
        )! as FieldItemNodeData;
        expect(freshDirectNestedNode).toBeInstanceOf(FieldItemNodeData);

        // DirectNestedChoiceElement → [outerChoice]
        const freshDirectNestedChildren =
          VisualizationService.generateNonDocumentNodeDataChildren(freshDirectNestedNode);
        const freshOuterChoice = freshDirectNestedChildren[0] as TargetChoiceFieldNodeData;
        expect(freshOuterChoice).toBeInstanceOf(TargetChoiceFieldNodeData);

        // outerChoice → [Direct1, innerChoice]
        const freshOuterChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshOuterChoice);
        const freshInnerChoice = freshOuterChoiceChildren.find(
          (c) => c instanceof TargetChoiceFieldNodeData,
        ) as TargetChoiceFieldNodeData;
        expect(freshInnerChoice).toBeDefined();

        // innerChoice → [NestedDirect1, NestedDirect2]
        const freshInnerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshInnerChoice);
        const freshNestedDirect1 = freshInnerChoiceChildren.find((c) => c.title === 'NestedDirect1');
        expect(freshNestedDirect1).toBeDefined();
        expect(freshNestedDirect1).toBeInstanceOf(FieldItemNodeData);

        // Visual path includes both choice wrapper segments; mapping path includes neither.
        // MappingLinksService.computeVisualTargetNodePath bridges this gap for line rendering.
        expect((freshNestedDirect1 as FieldItemNodeData).path.pathSegments).toContain(freshOuterChoice.id);
        expect((freshNestedDirect1 as FieldItemNodeData).path.pathSegments).toContain(freshInnerChoice.id);
        expect(nestedDirect1Item.nodePath.pathSegments).not.toContain(freshOuterChoice.id);
        expect(nestedDirect1Item.nodePath.pathSegments).not.toContain(freshInnerChoice.id);
      });
    });
  });

  describe('UnknownMappingItem visibility', () => {
    beforeEach(() => {
      MappingSerializerService.deserialize(getUnknownApplyTemplateXslt(), targetDoc, tree, paramsMap);
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    it('should include UnknownMappingNodeData in field children when mapping contains an unrecognized XSL element', () => {
      const shipOrderItem = tree.children[0];
      expect(shipOrderItem.children[0]).toBeInstanceOf(UnknownMappingItem);
      expect((shipOrderItem.children[0] as UnknownMappingItem).name).toEqual('unknown');
      expect((shipOrderItem.children[0] as UnknownMappingItem).element.localName).toEqual('apply-templates');

      const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const shipOrderNode = docChildren[0] as FieldItemNodeData;
      const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderNode);

      const unknownNode = shipOrderChildren.find((n) => n instanceof UnknownMappingNodeData) as UnknownMappingNodeData;
      expect(unknownNode).toBeDefined();
      expect(unknownNode.title).toEqual('unknown');
      expect(unknownNode.mapping).toBeInstanceOf(UnknownMappingItem);
    });

    it('should mark UnknownMappingNodeData as deletable and disallow condition menu and value selector', () => {
      const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const shipOrderNode = docChildren[0] as FieldItemNodeData;
      const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderNode);

      const unknownNode = shipOrderChildren.find((n) => n instanceof UnknownMappingNodeData) as UnknownMappingNodeData;
      expect(unknownNode).toBeDefined();
      expect(MappingActionService.getAllowedActions(unknownNode)).toContain(MappingActionKind.Delete);
      expect(MappingActionService.getAllowedActions(unknownNode)).not.toContain(MappingActionKind.ContextMenu);
      expect(MappingActionService.getAllowedActions(unknownNode)).not.toContain(MappingActionKind.ValueSelector);
    });

    it('should include UnknownMappingNodeData in children of a primitive target document', () => {
      const primitiveDoc = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const primitiveTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.Primitive,
      );
      const element = document.createElementNS('http://www.w3.org/1999/XSL/Transform', 'apply-templates');
      element.setAttribute('select', '/ns0:ShipOrder/Item');
      primitiveTree.children.push(new UnknownMappingItem(primitiveTree, element));
      const primitiveDocNode = new TargetDocumentNodeData(primitiveDoc, primitiveTree);

      const children = VisualizationService.generateStructuredDocumentChildren(primitiveDocNode);

      const unknownNode = children.find((n) => n instanceof UnknownMappingNodeData) as UnknownMappingNodeData;
      expect(unknownNode).toBeDefined();
      expect(unknownNode.mapping.element.localName).toEqual('apply-templates');
    });
  });

  describe('ACTION_REGISTRY apply smoke tests', () => {
    it('should successfully apply all context menu actions allowed for AddMappingNodeData', () => {
      MappingSerializerService.deserialize(getShipOrderToShipOrderXslt(), targetDoc, tree, paramsMap);
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);

      const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
      const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;

      const menuItems = MappingActionService.getMappingContextMenuItems(addMappingNode);
      expect(menuItems.length).toBeGreaterThan(0);

      for (const item of menuItems) {
        const freshTree = new MappingTree(
          targetDoc.documentType,
          targetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        MappingSerializerService.deserialize(getShipOrderToShipOrderXslt(), targetDoc, freshTree, paramsMap);
        const freshDocNode = new TargetDocumentNodeData(targetDoc, freshTree);
        const freshDocChildren = VisualizationService.generateStructuredDocumentChildren(freshDocNode);
        const freshShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshDocChildren[0]);
        const freshAddMappingNode = freshShipOrderChildren[4] as AddMappingNodeData;

        const onUpdate = jest.fn();
        const openModal = jest.fn();
        expect(() => {
          item.apply(freshAddMappingNode, { onUpdate, openModal });
        }).not.toThrow();
        expect(onUpdate.mock.calls.length + openModal.mock.calls.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
