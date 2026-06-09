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
  UnknownMappingItem,
  ValueSelector,
  VariableItem,
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
  VariableNodeData,
} from '../../models/datamapper/visualization';
import { useDocumentTreeStore } from '../../store/document-tree.store';
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

    describe('applyForEachGroup()', () => {
      it('should add for-each-group', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(docChildren.length).toEqual(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren.length).toEqual(4);
        expect(shipOrderChildren[3].title).toEqual('Item');
        MappingActionService.applyForEachGroup(shipOrderChildren[3] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[3].title).toEqual('for-each-group');
        const forEachGroupChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[3]);
        expect(forEachGroupChildren.length).toEqual(1);
        expect(forEachGroupChildren[0].title).toEqual('Item');
      });
    });

    describe('applyInnerForEach()', () => {
      it('should add inner for-each', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(docChildren.length).toEqual(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren.length).toEqual(4);
        expect(shipOrderChildren[0].title).toEqual('OrderId');
        MappingActionService.applyInnerForEach(shipOrderChildren[0] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[0].title).toEqual('OrderId');
        const orderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
        // Should have at least one child which is the for-each
        expect(orderIdChildren.length).toBeGreaterThanOrEqual(1);
        const forEachChild = orderIdChildren.find((child) => child.title === 'for-each');
        expect(forEachChild).toBeDefined();
        expect(forEachChild?.title).toEqual('for-each');
      });

      it('should add multiple inner for-each as siblings when applied to the same field', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[0].title).toEqual('OrderId');

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
        expect(forEachChildren.length).toEqual(2);

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
        expect(shipOrderChildren[0].title).toEqual('OrderId');

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
        expect(topLevelForEach.length).toEqual(1);

        // The nested for-each should be a child of the first for-each
        const nestedChildren = VisualizationService.generateNonDocumentNodeDataChildren(topLevelForEach[0]);
        const nestedForEach = nestedChildren.find((child) => child.title === 'for-each');
        expect(nestedForEach).toBeDefined();
        expect((nestedForEach as MappingNodeData).mapping.parent).toBe((topLevelForEach[0] as MappingNodeData).mapping);
      });
    });

    describe('applyInnerChooseWhenOtherwise()', () => {
      it('should add inner choose-when-otherwise', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(docChildren.length).toEqual(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren.length).toEqual(4);
        expect(shipOrderChildren[1].title).toEqual('OrderPerson');
        MappingActionService.applyInnerChooseWhenOtherwise(shipOrderChildren[1] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[1].title).toEqual('OrderPerson');
        const orderPersonChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[1]);
        // Should have at least one child which is the choose
        expect(orderPersonChildren.length).toBeGreaterThanOrEqual(1);
        const chooseChild = orderPersonChildren.find((child) => child.title === 'choose');
        expect(chooseChild).toBeDefined();
        expect(chooseChild?.title).toEqual('choose');

        // Verify choose has when and otherwise branches
        const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseChild!);
        expect(chooseChildren.length).toEqual(2);
        expect(chooseChildren[0].title).toEqual('when');
        expect(chooseChildren[1].title).toEqual('otherwise');
      });

      it('should add when with ValueSelector (not FieldItem) to inner choose', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[1].title).toEqual('OrderPerson');
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
        expect(chooseChildren.length).toEqual(3);
        expect(chooseChildren[0].title).toEqual('when');
        expect(chooseChildren[1].title).toEqual('when');
        expect(chooseChildren[2].title).toEqual('otherwise');

        // Verify the new when branch contains a ValueSelector, not a FieldItem
        const newWhenChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseChildren[1]);
        expect(newWhenChildren.length).toEqual(1);
        expect((newWhenChildren[0] as MappingNodeData).mapping instanceof ValueSelector).toBeTruthy();
      });

      it('should add when with ValueSelector to inner choose nested inside inner for-each', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[0].title).toEqual('OrderId');

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
        expect(chooseChildren.length).toEqual(3);
        expect(chooseChildren[0].title).toEqual('when');
        expect(chooseChildren[1].title).toEqual('when');
        expect(chooseChildren[2].title).toEqual('otherwise');

        // Verify the new when branch contains a ValueSelector, not a FieldItem
        const newWhenChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseChildren[1]);
        expect(newWhenChildren.length).toEqual(1);
        expect((newWhenChildren[0] as MappingNodeData).mapping instanceof ValueSelector).toBeTruthy();
      });
    });

    describe('applyInnerIf()', () => {
      it('should add inner if', () => {
        let docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(docChildren.length).toEqual(1);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren.length).toEqual(4);
        expect(shipOrderChildren[0].title).toEqual('OrderId');
        MappingActionService.applyInnerIf(shipOrderChildren[0] as TargetFieldNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[0].title).toEqual('OrderId');
        const orderIdChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
        // Should have at least one child which is the if
        expect(orderIdChildren.length).toBeGreaterThanOrEqual(1);
        const ifChild = orderIdChildren.find((child) => child.title === 'if');
        expect(ifChild).toBeDefined();
        expect(ifChild?.title).toEqual('if');
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
        expect(MappingActionService.getAllowedActions(targetDocNode)).not.toContain(MappingActionKind.ContextMenu);
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
        expect(MappingActionService.getAllowedActions(forEachNode)).toContain(MappingActionKind.ContextMenu);
        expect(MappingActionService.getAllowedActions(forEachNode)).toContain(MappingActionKind.Sort);

        expect(shipOrderChildren[4] instanceof AddMappingNodeData).toBeTruthy();
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(addMappingNode.title).toEqual('Item');
        expect(addMappingNode.id).toContain('add-mapping-fx-Item');
        expect(MappingActionService.getAllowedActions(addMappingNode)).toContain(MappingActionKind.ForEach);
        // TODO enable when https://github.com/KaotoIO/kaoto/issues/2866 is implemented
        // expect(MappingActionService.getAllowedActions(addMappingNode)).toContain(MappingActionKind.ForEachGroup);
        expect(MappingActionService.getAllowedActions(addMappingNode)).toContain(MappingActionKind.If);
        expect(MappingActionService.getAllowedActions(addMappingNode)).toContain(MappingActionKind.Choose);
        expect(MappingActionService.getAllowedActions(addMappingNode)).toContain(MappingActionKind.ContextMenu);
        expect(MappingActionService.getAllowedActions(addMappingNode)).not.toContain(MappingActionKind.ValueSelector);
      });

      it('should allow Delete for a field node added via Add Mapping', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(addMappingNode instanceof AddMappingNodeData).toBeTruthy();
        expect(MappingActionService.getAllowedActions(addMappingNode)).not.toContain(MappingActionKind.Delete);
        MappingActionService.addMapping(addMappingNode);
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );

        const addedNode = updatedShipOrderChildren.find(
          (n) => n instanceof FieldItemNodeData && n.title === 'Item',
        ) as FieldItemNodeData;
        expect(addedNode).toBeDefined();
        expect(MappingActionService.getAllowedActions(addedNode)).toContain(MappingActionKind.Delete);
      });

      it('should keep Delete for an existing value-mapped field node', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const orderIdNode = shipOrderChildren[0] as FieldItemNodeData;
        expect(orderIdNode.title).toEqual('OrderId');
        expect(MappingActionService.getAllowedActions(orderIdNode)).toContain(MappingActionKind.Delete);
      });

      it('should include ContextMenu for primitive TargetDocumentNodeData', () => {
        const primitiveTargetDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        const primitiveTree = new MappingTree(
          primitiveTargetDoc.documentType,
          primitiveTargetDoc.documentId,
          DocumentDefinitionType.Primitive,
        );
        const primitiveDocNode = new TargetDocumentNodeData(primitiveTargetDoc, primitiveTree);
        expect(MappingActionService.getAllowedActions(primitiveDocNode)).toContain(MappingActionKind.ContextMenu);
      });

      it('should allow ContextMenu and Sort but exclude ValueSelector for for-each-group nodes', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const itemNode = shipOrderChildren[3] as MappingNodeData;
        expect(itemNode.title).toEqual('for-each');

        const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(itemNode);
        const fieldInsideForEach = forEachChildren[0] as FieldItemNodeData;
        expect(fieldInsideForEach.title).toEqual('Item');
        expect(MappingActionService.getAllowedActions(fieldInsideForEach)).toContain(MappingActionKind.ContextMenu);

        MappingActionService.applyForEachGroup(shipOrderChildren[4] as AddMappingNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );

        const forEachGroupNode = updatedShipOrderChildren[4] as MappingNodeData;
        expect(forEachGroupNode.title).toEqual('for-each-group');
        expect(forEachGroupNode.mapping instanceof ForEachGroupItem).toBeTruthy();
        expect(MappingActionService.getAllowedActions(forEachGroupNode)).toContain(MappingActionKind.ContextMenu);
        expect(MappingActionService.getAllowedActions(forEachGroupNode)).toContain(MappingActionKind.Sort);
        expect(MappingActionService.getAllowedActions(forEachGroupNode)).not.toContain(MappingActionKind.ValueSelector);

        const forEachGroupChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachGroupNode);
        const fieldInsideForEachGroup = forEachGroupChildren[0] as FieldItemNodeData;
        expect(fieldInsideForEachGroup.title).toEqual('Item');
        expect(MappingActionService.getAllowedActions(fieldInsideForEachGroup)).toContain(
          MappingActionKind.ContextMenu,
        );
      });
    });

    describe('Sort action availability', () => {
      it('should not include Sort for non-ForEach nodes', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        const orderIdNode = shipOrderChildren[0] as FieldItemNodeData;
        expect(MappingActionService.getAllowedActions(orderIdNode)).not.toContain(MappingActionKind.Sort);

        const ifNode = shipOrderChildren[1] as MappingNodeData;
        expect(MappingActionService.getAllowedActions(ifNode)).not.toContain(MappingActionKind.Sort);
      });
    });

    describe('Variable action availability', () => {
      // TODO enable when https://github.com/KaotoIO/kaoto/issues/2846 is implemented
      it.skip('should include Variable for container FieldItemNodeData and TargetFieldNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        const shipOrderNode = targetDocChildren[0] as FieldItemNodeData;
        expect(MappingActionService.getAllowedActions(shipOrderNode)).toContain(MappingActionKind.Variable);

        const shipToNode = shipOrderChildren[2] as TargetFieldNodeData;
        expect(MappingActionService.getAllowedActions(shipToNode)).toContain(MappingActionKind.Variable);
      });

      it('should not include Variable for TargetDocumentNodeData', () => {
        expect(MappingActionService.getAllowedActions(targetDocNode)).not.toContain(MappingActionKind.Variable);
      });

      it('should not include Variable for AddMappingNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(MappingActionService.getAllowedActions(addMappingNode)).not.toContain(MappingActionKind.Variable);
      });

      it('should not include Variable for terminal field nodes', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        const orderIdNode = shipOrderChildren[0] as FieldItemNodeData;
        expect(orderIdNode.title).toEqual('OrderId');
        expect(MappingActionService.getAllowedActions(orderIdNode)).not.toContain(MappingActionKind.Variable);
      });

      // TODO enable when https://github.com/KaotoIO/kaoto/issues/2846 is implemented
      it.skip('should include Variable for ForEachItem and IfItem MappingNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        const ifNode = shipOrderChildren[1] as MappingNodeData;
        expect(ifNode.title).toEqual('if');
        expect(MappingActionService.getAllowedActions(ifNode)).toContain(MappingActionKind.Variable);

        const forEachNode = shipOrderChildren[3] as MappingNodeData;
        expect(forEachNode.title).toEqual('for-each');
        expect(MappingActionService.getAllowedActions(forEachNode)).toContain(MappingActionKind.Variable);
      });

      it('should not include Variable for VariableNodeData', () => {
        const variable = new VariableItem(tree, 'testVar');
        tree.children.push(variable);
        const variableNode = new VariableNodeData(targetDocNode, variable);
        expect(MappingActionService.getAllowedActions(variableNode)).not.toContain(MappingActionKind.Variable);
      });

      it('should not include Variable for ValueSelector, ChooseItem, or UnknownMappingItem MappingNodeData', () => {
        const fieldItem = new FieldItem(tree, targetDoc.fields[0]);
        tree.children.push(fieldItem);
        const valueSelector = new ValueSelector(fieldItem);
        fieldItem.children.push(valueSelector);
        const valueSelectorNode = new MappingNodeData(targetDocNode, valueSelector);
        expect(MappingActionService.getAllowedActions(valueSelectorNode)).not.toContain(MappingActionKind.Variable);

        const chooseItem = new ChooseItem(fieldItem, targetDoc.fields[0]);
        const chooseNode = new MappingNodeData(targetDocNode, chooseItem);
        expect(MappingActionService.getAllowedActions(chooseNode)).not.toContain(MappingActionKind.Variable);

        const unknownElement = document.createElementNS('http://www.w3.org/1999/XSL/Transform', 'apply-templates');
        const unknownItem = new UnknownMappingItem(fieldItem, unknownElement);
        fieldItem.children.push(unknownItem);
        const unknownNode = new MappingNodeData(targetDocNode, unknownItem);
        expect(MappingActionService.getAllowedActions(unknownNode)).not.toContain(MappingActionKind.Variable);
      });
    });

    describe('RenameVariable action availability', () => {
      // TODO enable when https://github.com/KaotoIO/kaoto/issues/2846 is implemented
      it.skip('should include RenameVariable only for VariableNodeData', () => {
        const variable = new VariableItem(tree, 'testVar');
        tree.children.push(variable);
        const variableNode = new VariableNodeData(targetDocNode, variable);
        expect(MappingActionService.getAllowedActions(variableNode)).toContain(MappingActionKind.RenameVariable);
      });

      it('should not include RenameVariable for non-variable nodes', () => {
        expect(MappingActionService.getAllowedActions(targetDocNode)).not.toContain(MappingActionKind.RenameVariable);

        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        const orderIdNode = shipOrderChildren[0] as FieldItemNodeData;
        expect(MappingActionService.getAllowedActions(orderIdNode)).not.toContain(MappingActionKind.RenameVariable);

        const ifNode = shipOrderChildren[1] as MappingNodeData;
        expect(MappingActionService.getAllowedActions(ifNode)).not.toContain(MappingActionKind.RenameVariable);

        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(MappingActionService.getAllowedActions(addMappingNode)).not.toContain(MappingActionKind.RenameVariable);
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

    describe('getOrCreateParentMapping()', () => {
      it('should return mappingTree for TargetDocumentNodeData', () => {
        const result = MappingActionService.getOrCreateParentMapping(targetDocNode);
        expect(result).toBe(tree);
      });

      it('should return FieldItem for AddMappingNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        const result = MappingActionService.getOrCreateParentMapping(addMappingNode);
        expect(result).toBeDefined();
        expect(result instanceof FieldItem).toBeTruthy();
      });

      it('should return FieldItem for TargetFieldNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const shipToNode = shipOrderChildren[2] as TargetFieldNodeData;
        const result = MappingActionService.getOrCreateParentMapping(shipToNode);
        expect(result).toBeDefined();
      });

      it('should return FieldItem for FieldItemNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const orderIdNode = shipOrderChildren[0] as FieldItemNodeData;
        const result = MappingActionService.getOrCreateParentMapping(orderIdNode);
        expect(result).toBeDefined();
      });

      it('should return mapping for MappingNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const ifNode = shipOrderChildren[1] as MappingNodeData;
        const result = MappingActionService.getOrCreateParentMapping(ifNode);
        expect(result).toBe(ifNode.mapping);
      });
    });

    describe('Variable and RenameVariable action apply callbacks', () => {
      // TODO enable when https://github.com/KaotoIO/kaoto/issues/2846 is implemented
      it.skip('Variable apply should call setAddingVariableTo with node path', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderNode = targetDocChildren[0] as FieldItemNodeData;
        const menuItems = MappingActionService.getMappingContextMenuItems(shipOrderNode);
        const variableAction = menuItems.find((item) => item.key === MappingActionKind.Variable);
        expect(variableAction).toBeDefined();
        expect(variableAction!.getLabel(shipOrderNode)).toEqual('Add variable');

        variableAction!.apply(shipOrderNode, { onUpdate: jest.fn(), openModal: jest.fn() });
        expect(useDocumentTreeStore.getState().addingVariableToNodePath).toEqual(shipOrderNode.path.toString());

        useDocumentTreeStore.getState().setAddingVariableTo(null);
      });

      // TODO enable when https://github.com/KaotoIO/kaoto/issues/2846 is implemented
      it.skip('RenameVariable apply should call setRenamingVariable with variable id', () => {
        const variable = new VariableItem(tree, 'testVar');
        tree.children.push(variable);
        const variableNode = new VariableNodeData(targetDocNode, variable);

        const menuItems = MappingActionService.getMappingContextMenuItems(variableNode);
        const renameAction = menuItems.find((item) => item.key === MappingActionKind.RenameVariable);
        expect(renameAction).toBeDefined();
        expect(renameAction!.getLabel(variableNode)).toEqual('Rename variable');

        renameAction!.apply(variableNode, { onUpdate: jest.fn(), openModal: jest.fn() });
        expect(useDocumentTreeStore.getState().renamingVariableId).toEqual(variable.id);

        useDocumentTreeStore.getState().setRenamingVariable(null);
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
      }
    });
  });
});
