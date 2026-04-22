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
  ForEachItem,
  IfItem,
  MappingTree,
  OtherwiseItem,
  UnknownMappingItem,
  ValueSelector,
  WhenItem,
} from '../../models/datamapper/mapping';
import { MappingActionKind } from '../../models/datamapper/mapping-action';
import {
  AddMappingNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
  UnknownMappingNodeData,
} from '../../models/datamapper/visualization';
import {
  getConditionalMappingsToShipOrderXslt,
  getContactsXsd,
  getExtensionSimpleXsd,
  getOrgXsd,
  getShipOrderToShipOrderInvalidForEachXslt,
  getShipOrderToShipOrderXslt,
  getUnknownApplyTemplateXslt,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { MappingActionService } from './mapping-action.service';
import { VisualizationService } from './visualization.service';

describe('MappingActionService', () => {
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
        MappingActionService.applyIf(shipOrderChildren[0] as TargetNodeData);

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
        MappingActionService.applyIf(targetDocNode);

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
        MappingActionService.applyChooseWhenOtherwise(shipOrderChildren[1] as TargetNodeData);

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
        MappingActionService.applyChooseWhenOtherwise(targetDocNode);

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
        MappingActionService.applyChooseWhenOtherwise(targetShipOrderChildren[1] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        MappingActionService.applyWhen(targetShipOrderChildren[1] as TargetNodeData);

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
        MappingActionService.applyChooseWhenOtherwise(targetDocNode);

        let targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        MappingActionService.applyWhen(targetDocChildren[0] as TargetNodeData);

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
        MappingActionService.applyChooseWhenOtherwise(targetShipOrderChildren[1] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        let chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetShipOrderChildren[1]);
        MappingActionService.deleteMappingItem(chooseChildren[1] as MappingNodeData);
        MappingActionService.applyOtherwise(targetShipOrderChildren[1] as TargetNodeData);

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
        MappingActionService.applyChooseWhenOtherwise(targetDocNode);

        let targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        let chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        MappingActionService.deleteMappingItem(chooseChildren[1] as MappingNodeData);
        MappingActionService.applyOtherwise(targetDocChildren[0] as TargetNodeData);

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
        MappingActionService.applyForEach(shipOrderChildren[3] as TargetFieldNodeData);

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
        MappingActionService.applyValueSelector(docChildren[0] as TargetNodeData);

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
        MappingActionService.applyValueSelector(targetDocNode);

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
        MappingActionService.engageMapping(tree, sourceShipOrderChildren[1] as FieldNodeData, targetDocNode);

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
        MappingActionService.engageMapping(tree, sourceShipOrderChildren[1] as FieldNodeData, targetDocNode);

        MappingActionService.deleteMappingItem(targetDocNode);
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
        MappingActionService.applyIf(targetShipOrderChildren[1] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const ifItem = tree.children[0].children[0] as IfItem;
        expect(ifItem.expression).toEqual('');
        MappingActionService.engageMapping(
          tree,
          sourceShipOrderChildren[1] as FieldNodeData,
          targetShipOrderChildren[1] as TargetNodeData,
        );

        expect(ifItem.expression).toEqual('/ns0:ShipOrder/ns0:OrderPerson');
      });

      it('should engage mapping to a Document', () => {
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        expect(tree.children.length).toEqual(0);
        MappingActionService.engageMapping(tree, sourceDocChildren[0] as FieldNodeData, targetDocNode);

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
        MappingActionService.engageMapping(
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
        MappingActionService.applyForEach(targetItem);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const forEach = targetShipOrderChildren[3] as MappingNodeData;
        const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEach);
        MappingActionService.engageMapping(tree, sourceItem, forEachChildren[0] as TargetFieldNodeData);

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
        MappingActionService.deleteMappingItem(targetForEachChildren[0] as TargetNodeData);

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
        MappingActionService.deleteMappingItem(targetForEachChildren[0] as TargetNodeData);
        MappingActionService.engageMapping(
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
        MappingActionService.deleteMappingItem(targetItemChildren[0] as TargetNodeData);

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

        MappingActionService.engageMapping(adtTree, comp02Node as FieldNodeData, adtOutDocNode);

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

        MappingActionService.engageMapping(tree, currencyAttr as FieldNodeData, targetDocNode);

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
      MappingActionService.applyForEach(targetContactField);

      targetContactsChildren = VisualizationService.generateStructuredDocumentChildren(targetContactsNode);
      contactsChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetContactsChildren[0]);
      MappingActionService.engageMapping(orgToContactsTree, emailField, contactsChildren[0] as TargetNodeData);

      targetContactsChildren = VisualizationService.generateStructuredDocumentChildren(targetContactsNode);
      contactsChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetContactsChildren[0]);
      let targetForEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(contactsChildren[0]);
      let targetContactChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetForEachChildren[0]);

      let targetOrgNameField = targetContactChildren.find(
        (child) => (child as TargetFieldNodeData).field?.name === 'OrgName',
      ) as TargetFieldNodeData;
      MappingActionService.engageMapping(orgToContactsTree, orgNameField, targetOrgNameField);
      let targetPersonNameField = targetContactChildren.find(
        (child) => (child as TargetFieldNodeData).field?.name === 'PersonName',
      ) as TargetFieldNodeData;
      MappingActionService.engageMapping(orgToContactsTree, personNameField, targetPersonNameField);
      let targetEmailField = targetContactChildren.find(
        (child) => (child as TargetFieldNodeData).field?.name === 'Email',
      ) as TargetFieldNodeData;
      MappingActionService.engageMapping(orgToContactsTree, emailField, targetEmailField);

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
        MappingActionService.deleteMappingItem(shipOrderChildren[1] as TargetNodeData);

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
        MappingActionService.addMapping(addMappingNode);

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

        MappingActionService.applyIf(addMappingNode);

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

        MappingActionService.applyChooseWhenOtherwise(addMappingNode);

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
