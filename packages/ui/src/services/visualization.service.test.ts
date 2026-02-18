import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
  PrimitiveDocument,
} from '../models/datamapper/document';
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
import {
  AddMappingNodeData,
  ChoiceFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../models/datamapper/visualization';
import {
  conditionalMappingsToShipOrderXslt,
  contactsXsd,
  extensionComplexXsd,
  extensionSimpleXsd,
  nestedConditionalsToShipOrderXslt,
  orgXsd,
  schemaTestXsd,
  shipOrderToShipOrderCollectionIndexXslt,
  shipOrderToShipOrderInvalidForEachXslt,
  shipOrderToShipOrderMultipleForEachXslt,
  shipOrderToShipOrderXslt,
  TestUtil,
} from '../stubs/datamapper/data-mapper';
import { DocumentUtilService } from './document-util.service';
import { MappingSerializerService } from './mapping-serializer.service';
import { VisualizationService } from './visualization.service';
import { XmlSchemaDocument } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';

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
    tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
  });

  describe('without pre-populated mappings', () => {
    beforeEach(() => {
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    describe('generateNodeDataChildren', () => {
      it('should generate primitive document children', () => {
        const primitiveSpy = jest.spyOn(VisualizationService, 'generatePrimitiveDocumentChildren');
        const structuredSpy = jest.spyOn(VisualizationService, 'generateStructuredDocumentChildren');
        const nonDocumentSpy = jest.spyOn(VisualizationService, 'generateNonDocumentNodeDataChildren');
        sourceDocNode.isPrimitive = true;
        VisualizationService.generateNodeDataChildren(sourceDocNode);

        expect(primitiveSpy).toHaveBeenCalled();
        expect(structuredSpy).not.toHaveBeenCalled();
        expect(nonDocumentSpy).not.toHaveBeenCalled();
      });

      it('should generate structured document children', () => {
        const primitiveSpy = jest.spyOn(VisualizationService, 'generatePrimitiveDocumentChildren');
        const structuredSpy = jest.spyOn(VisualizationService, 'generateStructuredDocumentChildren');
        const nonDocumentSpy = jest.spyOn(VisualizationService, 'generateNonDocumentNodeDataChildren');
        sourceDocNode.isPrimitive = false;
        VisualizationService.generateNodeDataChildren(sourceDocNode);

        expect(primitiveSpy).not.toHaveBeenCalled();
        expect(structuredSpy).toHaveBeenCalled();
        expect(nonDocumentSpy).not.toHaveBeenCalled();
      });

      it('should generate non document children', () => {
        const primitiveSpy = jest.spyOn(VisualizationService, 'generatePrimitiveDocumentChildren');
        const structuredSpy = jest.spyOn(VisualizationService, 'generateStructuredDocumentChildren');
        const nonDocumentSpy = jest.spyOn(VisualizationService, 'generateNonDocumentNodeDataChildren');

        VisualizationService.generateNodeDataChildren(new FieldNodeData(sourceDocNode, sourceDoc.fields[0]));

        expect(primitiveSpy).not.toHaveBeenCalled();
        expect(structuredSpy).not.toHaveBeenCalled();
        expect(nonDocumentSpy).toHaveBeenCalled();
      });
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
        const primitiveTargetDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        tree = new MappingTree(
          primitiveTargetDoc.documentType,
          primitiveTargetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
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
        expect(((forEachChildren[0] as FieldItemNodeData).mapping.children[0] as ValueSelector).expression).toEqual(
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
          { 'ExtensionSimple.xsd': extensionSimpleXsd },
        );
        const sourceDocResult = XmlSchemaDocumentService.createXmlSchemaDocument(extensionSimpleDef);
        const targetDocResult = XmlSchemaDocumentService.createXmlSchemaDocument(extensionSimpleDef);
        const tree = new MappingTree(
          targetDocResult.document!.documentType,
          targetDocResult.document!.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const sourceDocNode = new DocumentNodeData(sourceDocResult.document!);
        const targetDocNode = new TargetDocumentNodeData(targetDoc, tree);

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
        'Org.xsd': orgXsd,
      });
      const orgResult = XmlSchemaDocumentService.createXmlSchemaDocument(orgDefinition);
      expect(orgResult.validationStatus).toBe('success');
      const orgDoc = orgResult.document!;
      const contactsDefinition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'Contacts.xsd': contactsXsd },
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

    it('should render ExtensionSimple.xsd', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'extensionSimple.xsd': extensionSimpleXsd },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document!;
      const docNode = new DocumentNodeData(doc);
      const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
      expect(docChildren.length).toEqual(1);

      const product = docChildren[0];
      expect(product.title).toEqual('Product');
      const productChildren = VisualizationService.generateNonDocumentNodeDataChildren(product);
      expect(productChildren.length).toEqual(2);

      const nameField = productChildren.find((child) => child.title === 'name') as FieldNodeData;
      expect(nameField).toBeDefined();
      const nameChildren = VisualizationService.generateNonDocumentNodeDataChildren(nameField);

      expect(nameChildren.length).toEqual(2);
      const langAttr = nameChildren.find((child) => child.title === 'lang');
      expect(langAttr).toBeDefined();
      const formatAttr = nameChildren.find((child) => child.title === 'format');
      expect(formatAttr).toBeDefined();

      const priceField = productChildren.find((child) => child.title === 'price') as FieldNodeData;
      expect(priceField).toBeDefined();
      const priceChildren = VisualizationService.generateNonDocumentNodeDataChildren(priceField);

      expect(priceChildren.length).toEqual(3);
      const discountAttr = priceChildren.find((child) => child.title === 'discount');
      expect(discountAttr).toBeDefined();
      const currencyAttr = priceChildren.find((child) => child.title === 'currency');
      expect(currencyAttr).toBeDefined();
      const taxIncludedAttr = priceChildren.find((child) => child.title === 'taxIncluded');
      expect(taxIncludedAttr).toBeDefined();
    });

    it('should render ExtensionComplex.xsd', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'extensionComplex.xsd': extensionComplexXsd },
        { namespaceUri: 'http://www.example.com/TEST', name: 'Request' },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document!;
      const docNode = new DocumentNodeData(doc);
      const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
      expect(docChildren.length).toEqual(1);

      const request = docChildren[0];
      expect(request.title).toEqual('Request');
      const requestChildren = VisualizationService.generateNonDocumentNodeDataChildren(request);

      expect(requestChildren.length).toEqual(3);

      const nameField = requestChildren.find((child) => child.title === 'name');
      expect(nameField).toBeDefined();

      const userField = requestChildren.find((child) => child.title === 'user');
      expect(userField).toBeDefined();

      const timestampField = requestChildren.find((child) => child.title === 'timestamp');
      expect(timestampField).toBeDefined();
    });

    it('should render SchemaTest.xsd', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'schemaTest.xsd': schemaTestXsd },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document!;
      const docNode = new DocumentNodeData(doc);
      const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
      expect(docChildren.length).toEqual(1);

      const root = docChildren[0];
      expect(root.title).toEqual('Root');
      const rootChildren = VisualizationService.generateNonDocumentNodeDataChildren(root);
      expect(rootChildren.length).toEqual(2);

      const personField = rootChildren.find((child) => child.title === 'person') as FieldNodeData;
      expect(personField).toBeDefined();
      const personChildren = VisualizationService.generateNonDocumentNodeDataChildren(personField);

      expect(personChildren.length).toEqual(11);

      const nameField = personChildren.find((child) => child.title === 'name');
      expect(nameField).toBeDefined();

      const streetField = personChildren.find((child) => child.title === 'street');
      expect(streetField).toBeDefined();

      const cityField = personChildren.find((child) => child.title === 'city');
      expect(cityField).toBeDefined();

      const emailField = personChildren.find((child) => child.title === 'email');
      expect(emailField).toBeDefined();

      const phoneField = personChildren.find((child) => child.title === 'phone');
      expect(phoneField).toBeDefined();

      const faxField = personChildren.find((child) => child.title === 'fax');
      expect(faxField).toBeDefined();

      const createdByField = personChildren.find((child) => child.title === 'createdBy');
      expect(createdByField).toBeDefined();

      const createdDateField = personChildren.find((child) => child.title === 'createdDate');
      expect(createdDateField).toBeDefined();

      // Attributes from ExtendedAttributes -> CommonAttributes
      const idAttr = personChildren.find((child) => child.title === 'id');
      expect(idAttr).toBeDefined();

      const versionAttr = personChildren.find((child) => child.title === 'version');
      expect(versionAttr).toBeDefined();

      const statusAttr = personChildren.find((child) => child.title === 'status');
      expect(statusAttr).toBeDefined();

      const restrictedField = rootChildren.find((child) => child.title === 'restricted') as FieldNodeData;
      expect(restrictedField).toBeDefined();
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

        expect(shipOrderChildren.length).toEqual(5);
        const orderIdNode = shipOrderChildren[0] as FieldItemNodeData;
        expect(orderIdNode.title).toEqual('OrderId');
        expect(VisualizationService.allowConditionMenu(orderIdNode)).toBeTruthy();

        const ifNode = shipOrderChildren[1] as MappingNodeData;
        expect(ifNode.title).toEqual('if');
        expect(VisualizationService.allowConditionMenu(ifNode)).toBeTruthy();

        const shipToNode = shipOrderChildren[2] as TargetFieldNodeData;
        expect(shipToNode.title).toEqual('ShipTo');
        expect(VisualizationService.allowConditionMenu(shipToNode)).toBeTruthy();

        const forEachNode = shipOrderChildren[3] as MappingNodeData;
        expect(forEachNode.title).toEqual('for-each');
        expect(VisualizationService.allowConditionMenu(forEachNode)).toBeFalsy();

        expect(shipOrderChildren[4] instanceof AddMappingNodeData).toBeTruthy();
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(addMappingNode.title).toEqual('Item');
        expect(addMappingNode.id).toContain('add-mapping-fx-Item');
        expect(VisualizationService.allowForEach(addMappingNode)).toBeTruthy();
        expect(VisualizationService.allowIfChoose(addMappingNode)).toBeTruthy();
        expect(VisualizationService.allowConditionMenu(addMappingNode)).toBeTruthy();
        expect(VisualizationService.allowValueSelector(addMappingNode)).toBeFalsy();
      });
    });

    describe('generateDndId()', () => {
      it('should generate unique ID for when and otherwise children', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[3]);
        const forEachItemChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachChildren[0]);
        const forEachChooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachItemChildren[1]);
        const whenChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachChooseChildren[0]);
        const otherwiseChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachChooseChildren[1]);

        const whenChildDndId = VisualizationService.generateDndId(whenChildren[0]);
        expect(whenChildDndId).toContain('when');
        const otherwiseChildDndId = VisualizationService.generateDndId(otherwiseChildren[0]);
        expect(otherwiseChildDndId).toContain('otherwise');
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
  });

  it('should generate for multiple for-each on a same collection target field', () => {
    MappingSerializerService.deserialize(shipOrderToShipOrderMultipleForEachXslt, targetDoc, tree, paramsMap);
    targetDocNode = new TargetDocumentNodeData(targetDoc, tree);

    const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
    const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
    expect(shipOrderChildren.length).toEqual(6);
    expect(shipOrderChildren[0].title).toEqual('OrderId');
    expect(shipOrderChildren[1].title).toEqual('OrderPerson');
    expect(shipOrderChildren[2].title).toEqual('ShipTo');
    expect(shipOrderChildren[3].title).toEqual('for-each');
    expect(shipOrderChildren[4].title).toEqual('for-each');
    expect(shipOrderChildren[5].title).toEqual('Item');

    const forEach1Node = shipOrderChildren[3] as MappingNodeData;
    expect((forEach1Node.mapping as ForEachItem).expression).toEqual('/ns0:ShipOrder/Item');
    const forEach1Children = VisualizationService.generateNonDocumentNodeDataChildren(forEach1Node);
    expect(forEach1Children.length).toEqual(1);
    expect(forEach1Children[0].title).toEqual('Item');
    expect(VisualizationService.isCollectionField(forEach1Children[0]));
    const forEach1ItemChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEach1Children[0]);
    expect(forEach1ItemChildren.length).toEqual(4);
    expect(forEach1ItemChildren[0].title).toEqual('Title');
    const title1Selector = (forEach1ItemChildren[0] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(title1Selector.expression).toEqual('Title');

    const forEach2Node = shipOrderChildren[4] as MappingNodeData;
    expect((forEach2Node.mapping as ForEachItem).expression).toEqual('$sourceParam1/ns0:ShipOrder/Item');
    const forEach2Children = VisualizationService.generateNonDocumentNodeDataChildren(forEach2Node);
    expect(forEach2Children.length).toEqual(1);
    expect(forEach2Children[0].title).toEqual('Item');
    expect(VisualizationService.isCollectionField(forEach2Children[0]));
    const forEach2ItemChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEach2Children[0]);
    expect(forEach2ItemChildren.length).toEqual(4);
    expect(forEach2ItemChildren[0].title).toEqual('Title');
    const title2Selector = (forEach2ItemChildren[0] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(title2Selector.expression).toEqual('Title');

    expect(shipOrderChildren[5] instanceof AddMappingNodeData).toBeTruthy();
    const addMappingNode = shipOrderChildren[5] as AddMappingNodeData;
    expect(addMappingNode.title).toEqual('Item');
    expect(addMappingNode.id).toContain('add-mapping-fx-Item');
    expect(addMappingNode.field.name).toEqual('Item');
    expect(addMappingNode.field.maxOccurs).toEqual('unbounded');
  });

  it('should generate for multiple indexed collection mappings on a same collection target field', () => {
    jest
      .spyOn(global, 'crypto', 'get')
      .mockImplementation(() => ({ getRandomValues: () => [Math.random() * 10000] }) as unknown as Crypto);

    MappingSerializerService.deserialize(shipOrderToShipOrderCollectionIndexXslt, targetDoc, tree, paramsMap);
    targetDocNode = new TargetDocumentNodeData(targetDoc, tree);

    const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
    const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
    expect(shipOrderChildren.length).toEqual(6);
    expect(shipOrderChildren[0].title).toEqual('OrderId');
    expect(shipOrderChildren[1].title).toEqual('OrderPerson');
    expect(shipOrderChildren[2].title).toEqual('ShipTo');
    expect(shipOrderChildren[3].title).toEqual('Item');
    expect(VisualizationService.isCollectionField(shipOrderChildren[3])).toBeTruthy();
    expect(shipOrderChildren[4].title).toEqual('Item');
    expect(VisualizationService.isCollectionField(shipOrderChildren[4])).toBeTruthy();
    expect(shipOrderChildren[3].id).not.toEqual(shipOrderChildren[4].id);
    expect(shipOrderChildren[5].title).toEqual('Item');

    const item1Children = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[3]);
    expect(item1Children.length).toEqual(4);
    expect(item1Children[0].title).toEqual('Title');
    const title1Selector = (item1Children[0] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(title1Selector.expression).toEqual('/ns0:ShipOrder/Item[0]/Title');

    const item2Children = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[4]);
    expect(item2Children.length).toEqual(4);
    expect(item2Children[0].title).toEqual('Title');
    const title2Selector = (item2Children[0] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(title2Selector.expression).toEqual('/ns0:ShipOrder/Item[1]/Title');

    expect(shipOrderChildren[5] instanceof AddMappingNodeData).toBeTruthy();
    const addMappingNode = shipOrderChildren[5] as AddMappingNodeData;
    expect(addMappingNode.title).toEqual('Item');
    expect(addMappingNode.id).toContain('add-mapping-fx-Item');
    expect(addMappingNode.field.name).toEqual('Item');
    expect(addMappingNode.field.maxOccurs).toEqual('unbounded');
  });

  describe('isDeletableNode', () => {
    it('should identify deletable nodes', () => {
      MappingSerializerService.deserialize(conditionalMappingsToShipOrderXslt, targetDoc, tree, paramsMap);
      const docData = new TargetDocumentNodeData(targetDoc, tree);

      const fieldNodeData = new FieldItemNodeData(docData, tree.children[0] as FieldItem);
      expect(VisualizationService.isDeletableNode(fieldNodeData)).toBeFalsy();

      const forEachNodeData = new MappingNodeData(docData, tree.children[0].children[0] as ForEachItem);
      expect(VisualizationService.isDeletableNode(forEachNodeData)).toBeTruthy();

      const valueSelectorNodeData = new MappingNodeData(
        docData,
        tree.children[0].children[0].children[0] as ValueSelector,
      );
      expect(VisualizationService.isDeletableNode(valueSelectorNodeData)).toBeTruthy();
    });
  });

  describe('with nested conditional mappings', () => {
    beforeEach(() => {
      MappingSerializerService.deserialize(nestedConditionalsToShipOrderXslt, targetDoc, tree, paramsMap);
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    it('should generate nested if statements', () => {
      const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

      const outerIfNode = shipOrderChildren.find((child) => child.title === 'if') as MappingNodeData;
      expect(outerIfNode).toBeDefined();
      expect(outerIfNode.mapping).toBeInstanceOf(IfItem);

      const outerIfChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerIfNode);
      expect(outerIfChildren.length).toEqual(1);

      const innerIfNode = outerIfChildren[0] as MappingNodeData;
      expect(innerIfNode.title).toEqual('if');
      expect(innerIfNode.mapping).toBeInstanceOf(IfItem);

      const innerIfChildren = VisualizationService.generateNonDocumentNodeDataChildren(innerIfNode);
      expect(innerIfChildren.length).toEqual(1);
      expect(innerIfChildren[0].title).toEqual('OrderPerson');
      expect(innerIfChildren[0]).toBeInstanceOf(FieldItemNodeData);
    });

    it('should generate choose inside if', () => {
      const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

      const ifNodes = shipOrderChildren.filter((child) => child.title === 'if');
      const shipToIfNode = ifNodes[1] as MappingNodeData;
      expect(shipToIfNode).toBeDefined();
      expect(shipToIfNode.mapping).toBeInstanceOf(IfItem);

      const ifChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipToIfNode);
      expect(ifChildren.length).toEqual(1);

      const chooseNode = ifChildren[0] as MappingNodeData;
      expect(chooseNode.title).toEqual('choose');
      expect(chooseNode.mapping).toBeInstanceOf(ChooseItem);

      const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseNode);
      expect(chooseChildren.length).toEqual(2);
      expect(chooseChildren[0].title).toEqual('when');
      expect(chooseChildren[1].title).toEqual('otherwise');
    });

    it('should generate if inside for-each', () => {
      const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

      const ifNodes = shipOrderChildren.filter((child) => child.title === 'if');
      const itemIfNode = ifNodes[2] as MappingNodeData;
      expect(itemIfNode).toBeDefined();
      expect(itemIfNode.mapping).toBeInstanceOf(IfItem);

      const ifChildren = VisualizationService.generateNonDocumentNodeDataChildren(itemIfNode);
      expect(ifChildren.length).toEqual(1);

      const forEachNode = ifChildren[0] as MappingNodeData;
      expect(forEachNode.title).toEqual('for-each');
      expect(forEachNode.mapping).toBeInstanceOf(ForEachItem);

      const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachNode);
      expect(forEachChildren.length).toEqual(1);
      expect(forEachChildren[0].title).toEqual('Item');

      const itemChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachChildren[0]);
      expect(itemChildren.length).toEqual(4);
      expect(itemChildren[0].title).toEqual('Title');

      const noteIfNode = itemChildren[1] as MappingNodeData;
      expect(noteIfNode.title).toEqual('if');
      expect(noteIfNode.mapping).toBeInstanceOf(IfItem);

      const noteIfChildren = VisualizationService.generateNonDocumentNodeDataChildren(noteIfNode);
      expect(noteIfChildren.length).toEqual(1);
      expect(noteIfChildren[0].title).toEqual('Note');

      expect(itemChildren[2].title).toEqual('Quantity');
      expect(itemChildren[3].title).toEqual('Price');
    });
  });

  describe('choice fields', () => {
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
        name: 'choice',
        displayName: DocumentUtilService.formatChoiceDisplayName(memberFields as unknown as IField[]),
        isChoice: true,
        selectedMemberIndex,
        fields: memberFields,
      } as unknown as typeof baseField;
    }

    describe('isChoiceField', () => {
      it('should return true for ChoiceFieldNodeData', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
        const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
        expect(VisualizationService.isChoiceField(choiceNode)).toBe(true);
      });

      it('should return true for TargetChoiceFieldNodeData', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
        const choiceNode = new TargetChoiceFieldNodeData(targetDocNode, choiceField);
        expect(VisualizationService.isChoiceField(choiceNode)).toBe(true);
      });

      it('should return false for regular FieldNodeData', () => {
        const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
        expect(VisualizationService.isChoiceField(fieldNode)).toBe(false);
      });

      it('should return false for DocumentNodeData', () => {
        expect(VisualizationService.isChoiceField(sourceDocNode)).toBe(false);
      });
    });

    describe('hasChildren', () => {
      it('should return true for choice field with members', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
        const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
        expect(VisualizationService.hasChildren(choiceNode)).toBe(true);
      });

      it('should return false for choice field with empty members', () => {
        const choiceField = createMockChoiceField([]);
        const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
        expect(VisualizationService.hasChildren(choiceNode)).toBe(false);
      });

      it('should return false for choice field with no members', () => {
        const choiceField = createMockChoiceField([]);
        choiceField.fields = [];
        const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
        expect(VisualizationService.hasChildren(choiceNode)).toBe(false);
      });
    });

    describe('doGenerateNodeDataFromFields with choice fields', () => {
      it('should create ChoiceFieldNodeData for unselected source choice fields', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
        const parentField = {
          ...sourceDoc.fields[0],
          fields: [choiceField],
        };
        const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
        const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        expect(children.length).toEqual(1);
        expect(children[0]).toBeInstanceOf(ChoiceFieldNodeData);
      });

      it('should create TargetChoiceFieldNodeData for unselected target choice fields', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
        const parentField = {
          ...targetDoc.fields[0],
          fields: [choiceField],
        };
        const parentNode = new TargetFieldNodeData(targetDocNode, parentField as (typeof targetDoc.fields)[0]);
        const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        expect(children.length).toEqual(1);
        expect(children[0]).toBeInstanceOf(TargetChoiceFieldNodeData);
      });

      it('should create ChoiceFieldNodeData with selected member for source choice fields', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }, { name: 'fax' }], 0);
        const parentField = {
          ...sourceDoc.fields[0],
          fields: [choiceField],
        };
        const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
        const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        expect(children.length).toEqual(1);
        expect(children[0]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(children[0].title).toEqual('email');
      });

      it('should create TargetChoiceFieldNodeData with selected member for target choice fields', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }, { name: 'fax' }], 1);
        const parentField = {
          ...targetDoc.fields[0],
          fields: [choiceField],
        };
        const parentNode = new TargetFieldNodeData(targetDocNode, parentField as (typeof targetDoc.fields)[0]);
        const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        expect(children.length).toEqual(1);
        expect(children[0]).toBeInstanceOf(TargetChoiceFieldNodeData);
        expect(children[0].title).toEqual('phone');
      });

      it('should still report isChoiceField for selected choice members', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 0);
        const parentField = {
          ...sourceDoc.fields[0],
          fields: [choiceField],
        };
        const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
        const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        expect(VisualizationService.isChoiceField(children[0])).toBe(true);
      });

      it('should set choiceField reference for selected choice members', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 0);
        const parentField = {
          ...sourceDoc.fields[0],
          fields: [choiceField],
        };
        const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
        const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        const choiceNode = children[0] as ChoiceFieldNodeData;
        expect(choiceNode.choiceField).toBe(choiceField);
      });

      it('should not set choiceField reference for unselected choice fields', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
        const parentField = {
          ...sourceDoc.fields[0],
          fields: [choiceField],
        };
        const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
        const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        const choiceNode = children[0] as ChoiceFieldNodeData;
        expect(choiceNode.choiceField).toBeUndefined();
      });

      it('should use choice field itself when selectedMemberIndex is out of bounds', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 99);
        const parentField = {
          ...sourceDoc.fields[0],
          fields: [choiceField],
        };
        const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
        const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        expect(children.length).toEqual(1);
        expect(children[0]).toBeInstanceOf(ChoiceFieldNodeData);
      });
    });

    describe('generateNonDocumentNodeDataChildren for choice nodes', () => {
      it('should expand all choice members as children', () => {
        const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
        const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
        const children = VisualizationService.generateNonDocumentNodeDataChildren(choiceNode);
        expect(children.length).toEqual(2);
      });
    });

    describe('nested choice fields', () => {
      function createNestedChoiceFields(outerSelectedIndex?: number, innerSelectedIndex?: number) {
        const baseField = sourceDoc.fields[0];
        const innerMembers = [
          { ...baseField, name: 'x', displayName: 'x', fields: [], isChoice: false },
          { ...baseField, name: 'y', displayName: 'y', fields: [], isChoice: false },
        ];
        const innerChoice = {
          ...baseField,
          name: 'choice',
          displayName: DocumentUtilService.formatChoiceDisplayName(innerMembers as unknown as IField[]),
          isChoice: true,
          fields: innerMembers,
          selectedMemberIndex: innerSelectedIndex,
        };
        const regularMember = {
          ...baseField,
          name: 'regularField',
          displayName: 'regularField',
          fields: [],
          isChoice: false,
        };
        const outerMembers = [innerChoice, regularMember];
        const outerChoice = {
          ...baseField,
          name: 'choice',
          displayName: DocumentUtilService.formatChoiceDisplayName(outerMembers as unknown as IField[]),
          isChoice: true,
          fields: outerMembers,
          selectedMemberIndex: outerSelectedIndex,
        } as unknown as typeof baseField;
        return { outerChoice, innerChoice, regularMember, innerMembers };
      }

      it('both unselected: outer shows as ChoiceFieldNodeData with all members', () => {
        const { outerChoice, innerChoice } = createNestedChoiceFields();
        const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
        const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
        const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        expect(children.length).toEqual(1);
        expect(children[0]).toBeInstanceOf(ChoiceFieldNodeData);
        const outerNode = children[0] as ChoiceFieldNodeData;
        expect(outerNode.choiceField).toBeUndefined();

        const outerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
        expect(outerChildren.length).toEqual(2);
        expect(outerChildren[0]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerChildren[0].title).toEqual(innerChoice.displayName);
        expect(outerChildren[1]).toBeInstanceOf(FieldNodeData);
        expect(outerChildren[1]).not.toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerChildren[1].title).toEqual('regularField');
      });

      it('outer selected with inner choice: shows inner choice directly with choiceField reference', () => {
        const { outerChoice, innerChoice } = createNestedChoiceFields(0);
        const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
        const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
        const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        expect(children.length).toEqual(1);
        const outerNode = children[0] as ChoiceFieldNodeData;
        expect(outerNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerNode.field).toBe(innerChoice);
        expect(outerNode.choiceField).toBe(outerChoice);

        const innerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
        expect(innerChildren.length).toEqual(2);
        expect(innerChildren[0].title).toEqual('x');
        expect(innerChildren[1].title).toEqual('y');
      });

      it('inner selected, outer unselected: inner choice shows selected member', () => {
        const { outerChoice } = createNestedChoiceFields(undefined, 1);
        const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
        const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
        const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        expect(children.length).toEqual(1);
        const outerNode = children[0] as ChoiceFieldNodeData;
        expect(outerNode.choiceField).toBeUndefined();

        const outerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
        expect(outerChildren.length).toEqual(2);
        const innerNode = outerChildren[0] as ChoiceFieldNodeData;
        expect(innerNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(innerNode.title).toEqual('y');
        expect(innerNode.choiceField).not.toBeUndefined();
        expect(outerChildren[1].title).toEqual('regularField');
      });

      it('both selected: resolves in two steps with choiceField references at each level', () => {
        const { outerChoice, innerChoice } = createNestedChoiceFields(0, 1);
        const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
        const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);

        const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        expect(children.length).toEqual(1);
        const outerNode = children[0] as ChoiceFieldNodeData;
        expect(outerNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerNode.field).toBe(innerChoice);
        expect(outerNode.choiceField).toBe(outerChoice);

        const innerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
        expect(innerChildren.length).toEqual(1);
        const innerNode = innerChildren[0] as ChoiceFieldNodeData;
        expect(innerNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(innerNode.title).toEqual('y');
        expect(innerNode.choiceField).toBe(innerChoice);
      });

      it('multi-step revert: reverting inner selection restores inner choice members', () => {
        const { outerChoice, innerChoice } = createNestedChoiceFields(0, 1);
        const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
        const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);

        const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        const outerNode = children[0] as ChoiceFieldNodeData;
        const innerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
        const innerNode = innerChildren[0] as ChoiceFieldNodeData;
        expect(innerNode.choiceField).toBe(innerChoice);

        innerNode.choiceField!.selectedMemberIndex = undefined;

        const refreshedInnerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
        expect(refreshedInnerChildren.length).toEqual(2);
        expect(refreshedInnerChildren[0].title).toEqual('x');
        expect(refreshedInnerChildren[1].title).toEqual('y');
        expect((refreshedInnerChildren[0] as ChoiceFieldNodeData).choiceField).toBeUndefined();
      });

      it('multi-step revert: reverting outer selection after inner restores outer choice members', () => {
        const { outerChoice, innerChoice } = createNestedChoiceFields(0, 1);
        const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
        const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);

        innerChoice.selectedMemberIndex = undefined;

        const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        const outerNode = children[0] as ChoiceFieldNodeData;
        expect(outerNode.choiceField).toBe(outerChoice);

        outerNode.choiceField!.selectedMemberIndex = undefined;

        const refreshedChildren = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
        expect(refreshedChildren.length).toEqual(1);
        const refreshedOuterNode = refreshedChildren[0] as ChoiceFieldNodeData;
        expect(refreshedOuterNode.choiceField).toBeUndefined();

        const outerMembers = VisualizationService.generateNonDocumentNodeDataChildren(refreshedOuterNode);
        expect(outerMembers.length).toEqual(2);
        expect(outerMembers[0]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerMembers[1].title).toEqual('regularField');
      });
    });
  });
});
