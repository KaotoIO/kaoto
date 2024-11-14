import { VisualizationService } from './visualization.service';
import {
  DocumentNodeData,
  FieldNodeData,
  MappingNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../models/datamapper/visualization';
import {
  ChooseItem,
  ExpressionItem,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingTree,
  OtherwiseItem,
  ValueSelector,
  WhenItem,
} from '../models/datamapper/mapping';
import { XmlSchemaDocument } from './xml-schema-document.service';
import { MappingSerializerService } from './mapping-serializer.service';
import { BODY_DOCUMENT_ID, IDocument, PrimitiveDocument } from '../models/datamapper/document';
import { shipOrderToShipOrderInvalidForEachXslt, shipOrderToShipOrderXslt, TestUtil } from '../stubs/data-mapper';
import { DocumentType } from '../models/datamapper/path';

describe('VisualizationService', () => {
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
    tree = new MappingTree(targetDoc.documentType, targetDoc.documentId);
  });

  describe('without pre-populated mappings', () => {
    beforeEach(() => {
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    describe('testNodePair()', () => {
      it('should sort source, target', () => {
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const { sourceNode, targetNode } = VisualizationService.testNodePair(
          targetDocChildren[0],
          sourceDocChildren[0],
        );
        expect(sourceNode).toEqual(sourceDocChildren[0]);
        expect(targetNode).toEqual(targetDocChildren[0]);
      });
    });

    describe('applyIf()', () => {
      it('should add If', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(docChildren.length).toEqual(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren.length).toEqual(4);
        expect(shipOrderChildren[0].title).toEqual('OrderId');
        VisualizationService.applyIf(shipOrderChildren[0] as TargetNodeData);

        expect(tree.children[0].name).toEqual('field-ShipOrder');
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
        const primitiveTargetDoc = new PrimitiveDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
        tree = new MappingTree(primitiveTargetDoc.documentType, primitiveTargetDoc.documentId);
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

        expect(tree.children[0].name).toEqual('field-ShipOrder');
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
        expect(whenChildren[0].title).toEqual('OrderPerson');

        expect(chooseChildren[1].title).toEqual('otherwise');
        const otherwiseChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseChildren[1]);
        expect(otherwiseChildren.length).toEqual(1);
        expect(otherwiseChildren[0].title).toEqual('OrderPerson');
      });

      it('should add Choose-When-Otherwise on primitive target body', () => {
        const primitiveTargetDoc = new PrimitiveDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
        tree = new MappingTree(primitiveTargetDoc.documentType, primitiveTargetDoc.documentId);
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
        const primitiveTargetDoc = new PrimitiveDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
        tree = new MappingTree(primitiveTargetDoc.documentType, primitiveTargetDoc.documentId);
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
        const primitiveTargetDoc = new PrimitiveDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
        tree = new MappingTree(primitiveTargetDoc.documentType, primitiveTargetDoc.documentId);
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
        const primitiveTargetDoc = new PrimitiveDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
        tree = new MappingTree(primitiveTargetDoc.documentType, primitiveTargetDoc.documentId);
        targetDocNode = new TargetDocumentNodeData(primitiveTargetDoc, tree);
        VisualizationService.applyValueSelector(targetDocNode);

        expect(VisualizationService.hasChildren(targetDocNode)).toBeFalsy();
        const targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        expect(targetDocChildren.length).toEqual(0);
      });
    });

    describe('getExpressionItemForNode()', () => {
      it('should return ValueSelector for primitive target body', () => {
        const primitiveTargetDoc = new PrimitiveDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
        tree = new MappingTree(primitiveTargetDoc.documentType, primitiveTargetDoc.documentId);
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
        VisualizationService.engageMapping(tree, sourceShipOrderChildren[1] as FieldNodeData, targetDocNode);

        const expressionItem = VisualizationService.getExpressionItemForNode(targetDocNode);
        expect(expressionItem?.expression).toEqual('/ns0:ShipOrder/ns0:OrderPerson');
      });
    });

    describe('deleteMappingItem()', () => {
      it('should delete primitive target body mapping', () => {
        const primitiveTargetDoc = new PrimitiveDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
        tree = new MappingTree(primitiveTargetDoc.documentType, primitiveTargetDoc.documentId);
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
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

        expect((forEach.mapping as ExpressionItem).expression).toEqual('');
        expect(((forEachChildren[0] as TargetFieldNodeData).mapping!.children[0] as ValueSelector).expression).toEqual(
          '/ns0:ShipOrder/Item',
        );
      });

      it('should not remove for-each targeted field item when selector is removed', () => {
        MappingSerializerService.deserialize(shipOrderToShipOrderInvalidForEachXslt, targetDoc, tree, paramsMap);

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
        MappingSerializerService.deserialize(shipOrderToShipOrderInvalidForEachXslt, targetDoc, tree, paramsMap);

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
    });
  });

  describe('with pre-populated mappings', () => {
    beforeEach(() => {
      MappingSerializerService.deserialize(shipOrderToShipOrderXslt, targetDoc, tree, paramsMap);
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    describe('allowIfChoose()', () => {
      it('should test if or choose is allowed', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        expect(VisualizationService.allowIfChoose(targetDocNode)).toBeTruthy();
        expect(VisualizationService.allowIfChoose(targetDocChildren[0] as TargetNodeData)).toBeTruthy();
        expect(VisualizationService.allowIfChoose(shipOrderChildren[1] as TargetNodeData)).toBeFalsy();
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

    describe('allowConditionMenu()', () => {
      it('should test condition menu is allowed', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(VisualizationService.allowConditionMenu(targetDocNode)).toBeTruthy();
        expect(VisualizationService.allowConditionMenu(targetDocChildren[0] as TargetNodeData)).toBeTruthy();

        expect(shipOrderChildren.length).toEqual(4);
        const orderIdNode = shipOrderChildren[0] as TargetFieldNodeData;
        expect(orderIdNode.title).toEqual('OrderId');
        expect(VisualizationService.allowConditionMenu(orderIdNode)).toBeFalsy();

        const ifNode = shipOrderChildren[1] as MappingNodeData;
        expect(ifNode.title).toEqual('if');
        expect(VisualizationService.allowConditionMenu(ifNode)).toBeTruthy();

        const shipToNode = shipOrderChildren[2] as TargetFieldNodeData;
        expect(shipToNode.title).toEqual('ShipTo');
        expect(VisualizationService.allowConditionMenu(shipToNode)).toBeFalsy();

        const forEachNode = shipOrderChildren[3] as MappingNodeData;
        expect(forEachNode.title).toEqual('for-each');
        expect(VisualizationService.allowConditionMenu(forEachNode)).toBeFalsy();
      });
    });
  });
});
