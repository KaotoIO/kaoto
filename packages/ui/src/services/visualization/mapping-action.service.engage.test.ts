import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
} from '../../models/datamapper/document';
import {
  CopyOfSelector,
  CopyOfType,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingTree,
  ValueOfSelector,
  ValueSelector,
  VariableItem,
} from '../../models/datamapper/mapping';
import {
  ChoiceFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  NodeData,
  SourceNodeDataType,
  SourceVariableNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
  TargetRenderIndex,
} from '../../models/datamapper/visualization';
import {
  getAdtInXsd,
  getContactsXsd,
  getEnvelopeXsd,
  getExtensionSimpleXsd,
  getOrderInfoXsd,
  getOrgXsd,
  getShipOrderToShipOrderInvalidForEachXslt,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { expectNoDecisionChange } from '../../stubs/datamapper/target-render-test-helpers';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { CopyOfPlacementService } from '../mapping/copy-of-placement.service';
import { FieldMatchingService } from '../mapping/field-matching.service';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { MappingActionService } from './mapping-action.service';
import { TargetRenderService } from './target-render.service';
import { VisualizationService } from './visualization.service';

describe('MappingActionService — mapping engagement', () => {
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

  function childField(parent: IField, name: string): IField {
    return parent.fields.find((field) => field.name === name)!;
  }

  function buildRenderIndex(mappingTree: MappingTree = tree, sourceBody: IDocument = sourceDoc) {
    return TargetRenderService.buildIndex(mappingTree, { sourceParameterMap: paramsMap, sourceBody });
  }

  function buildItemLoop(): FieldItem {
    tree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };
    const shipOrderItem = new FieldItem(tree, targetDoc.fields[0]);
    tree.children.push(shipOrderItem);
    const forEachItem = new ForEachItem(shipOrderItem);
    forEachItem.expression = '/ns0:ShipOrder/Item';
    shipOrderItem.children.push(forEachItem);
    const itemFieldItem = new FieldItem(forEachItem, childField(targetDoc.fields[0], 'Item'));
    forEachItem.children.push(itemFieldItem);
    return itemFieldItem;
  }

  function mapField(parent: FieldItem | IfItem, field: IField, expression: string): FieldItem {
    const fieldItem = new FieldItem(parent, field);
    parent.children.push(fieldItem);
    const selector = new ValueOfSelector(fieldItem);
    selector.expression = expression;
    fieldItem.children.push(selector);
    return fieldItem;
  }

  describe('without pre-populated mappings', () => {
    beforeEach(() => {
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    describe('removeParentContainerCopyOf via engageMapping', () => {
      it('should remove copy-of when child field is mapped via DnD', () => {
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
        const sourceItem = sourceShipOrderChildren[3] as FieldNodeData;

        let targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const targetItem = targetShipOrderChildren[3] as TargetFieldNodeData;
        MappingActionService.engageMapping(tree, sourceItem, targetItem);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const forEachNode = targetShipOrderChildren[3] as MappingNodeData;
        const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachNode);
        const itemNode = forEachChildren[0] as FieldItemNodeData;
        const itemMapping = itemNode.mapping;
        expect(
          itemMapping.children.some((c) => c instanceof CopyOfSelector && c.valueType === CopyOfType.CONTAINER),
        ).toBe(true);

        const sourceItemChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceShipOrderChildren[3]);
        const sourceTitleField = sourceItemChildren[0] as FieldNodeData;
        const targetItemChildren = VisualizationService.generateNonDocumentNodeDataChildren(itemNode);
        const targetTitleField = targetItemChildren[0] as TargetFieldNodeData;
        MappingActionService.engageMapping(tree, sourceTitleField, targetTitleField);

        expect(
          itemMapping.children.some((c) => c instanceof CopyOfSelector && c.valueType === CopyOfType.CONTAINER),
        ).toBe(false);
        expect(itemMapping.children.some((c) => c instanceof FieldItem && c.field.name === 'Title')).toBe(true);
      });

      it('should preserve explicit CONTAINER_NODE copy-of when child field is mapped via DnD', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const targetShipTo = targetShipOrderChildren.find(
          (c) => c instanceof TargetFieldNodeData && c.field.name === 'ShipTo',
        ) as TargetFieldNodeData;
        MappingActionService.applyCopyOfSelector(targetShipTo);

        const shipOrderMapping = tree.children[0] as FieldItem;
        const shipToMapping = shipOrderMapping.children.find(
          (c) => c instanceof FieldItem && c.field.name === 'ShipTo',
        ) as FieldItem;
        expect(
          shipToMapping.children.some((c) => c instanceof CopyOfSelector && c.valueType === CopyOfType.CONTAINER_NODE),
        ).toBe(true);

        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
        const sourceShipTo = sourceShipOrderChildren.find(
          (c) => c instanceof FieldNodeData && c.field.name === 'ShipTo',
        ) as FieldNodeData;
        const sourceShipToChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceShipTo);
        const sourceNameField = sourceShipToChildren[0] as FieldNodeData;

        const updatedTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(updatedTargetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );
        const updatedShipToNode = updatedShipOrderChildren.find(
          (c) => c instanceof FieldItemNodeData && c.field.name === 'ShipTo',
        ) as FieldItemNodeData;
        const shipToNodeChildren = VisualizationService.generateNonDocumentNodeDataChildren(updatedShipToNode);
        const targetNameField = shipToNodeChildren.find(
          (c) => c instanceof TargetFieldNodeData && c.field.name === 'Name',
        ) as TargetFieldNodeData;
        MappingActionService.engageMapping(tree, sourceNameField, targetNameField);

        expect(
          shipToMapping.children.some((c) => c instanceof CopyOfSelector && c.valueType === CopyOfType.CONTAINER_NODE),
        ).toBe(true);
        expect(shipToMapping.children.some((c) => c instanceof FieldItem && c.field.name === 'Name')).toBe(true);
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
        expect(ifItem.expression).toBe('');
        MappingActionService.engageMapping(
          tree,
          sourceShipOrderChildren[1] as FieldNodeData,
          targetShipOrderChildren[1] as TargetNodeData,
        );

        expect(ifItem.expression).toBe('/ns0:ShipOrder/ns0:OrderPerson');
      });

      it('should engage mapping to a Document', () => {
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        expect(tree.children).toHaveLength(0);
        MappingActionService.engageMapping(tree, sourceDocChildren[0] as FieldNodeData, targetDocNode);

        expect(tree.children[0] instanceof ValueSelector).toBeTruthy();
        const selector = tree.children[0] as ValueSelector;
        expect(selector.expression).toBe('/ns0:ShipOrder');
      });

      it('should report only the first drop onto the document as structural', () => {
        const sourceShipOrder = VisualizationService.generateStructuredDocumentChildren(
          sourceDocNode,
        )[0] as FieldNodeData;

        expect(MappingActionService.engageMapping(tree, sourceShipOrder, targetDocNode)).toBe(true);
        expect(MappingActionService.engageMapping(tree, sourceShipOrder, targetDocNode)).toBe(false);

        expect(tree.children).toHaveLength(1);
        expect(tree.children[0]).toBeInstanceOf(ValueSelector);
      });

      it('should engage mapping to a field', () => {
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(tree.children).toHaveLength(0);
        MappingActionService.engageMapping(
          tree,
          sourceShipOrderChildren[1] as FieldNodeData,
          targetShipOrderChildren[1] as TargetNodeData,
        );

        expect(tree.children[0] instanceof FieldItem).toBeTruthy();
        expect(tree.children[0].children[0] instanceof FieldItem).toBeTruthy();
        expect(tree.children[0].children[0].children[0] instanceof ValueSelector).toBeTruthy();
        const selector = tree.children[0].children[0].children[0] as ValueSelector;
        expect(selector.expression).toBe('/ns0:ShipOrder/ns0:OrderPerson');
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

        expect((forEach.mapping as ForEachItem).expression).toBe('');
        expect(((forEachChildren[0] as FieldItemNodeData).mapping.children[0] as ValueSelector).expression).toBe(
          '/ns0:ShipOrder/Item',
        );
      });

      it('should not remove for-each targeted field item when selector is removed', () => {
        MappingSerializerService.deserialize(getShipOrderToShipOrderInvalidForEachXslt(), targetDoc, tree, paramsMap);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        let targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        let forEachItem = (targetShipOrderChildren[3] as MappingNodeData).mapping as ForEachItem;
        expect(forEachItem.children).toHaveLength(1);
        expect(forEachItem.expression).toBe('');
        let targetForEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          targetShipOrderChildren[3],
        );
        let itemItem = targetForEachChildren[0] as TargetFieldNodeData;
        expect((itemItem.mapping?.children[0] as ValueSelector).expression).toBe('/ns0:ShipOrder/Item');
        MappingActionService.deleteMappingItem(targetForEachChildren[0] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        forEachItem = (targetShipOrderChildren[3] as MappingNodeData).mapping as ForEachItem;
        expect(forEachItem).toBeDefined();
        expect(forEachItem.children).toHaveLength(1);
        expect(forEachItem.expression).toBe('');
        targetForEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetShipOrderChildren[3]);
        itemItem = targetForEachChildren[0] as TargetFieldNodeData;
        expect(itemItem.mapping).toBeDefined();
        expect(itemItem.mapping?.children.length).toBe(0);
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
        // the whole-element copy-of selector is not empty, so it renders after the fields; index 0 is "Title"
        MappingActionService.engageMapping(
          tree,
          sourceItemChildren[0] as FieldNodeData,
          targetItemChildren[0] as TargetFieldNodeData,
        );

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        targetForEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetShipOrderChildren[3]);
        targetItemChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetForEachChildren[0]);
        expect(((targetItemChildren[0] as TargetFieldNodeData).mapping?.children[0] as ValueSelector).expression).toBe(
          '/ns0:ShipOrder/Item/Title',
        );
        MappingActionService.deleteMappingItem(targetItemChildren[0] as TargetNodeData);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const forEachItem = (targetShipOrderChildren[3] as MappingNodeData).mapping as ForEachItem;
        expect(forEachItem).toBeDefined();
        expect(forEachItem.children).toHaveLength(1);
        expect(forEachItem.expression).toBe('');
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
        expect(expressionItem?.expression).toBe('/HL7/PID/field_01/comp_02');
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
        expect(expressionItem?.expression).toBe('/ns0:Product/ns0:price/@currency');
      });
    });

    describe('container auto-mapping', () => {
      it('should place ForEachItem with copy-of in parent when both collections share name and namespace', () => {
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
        const sourceItem = sourceShipOrderChildren[3] as FieldNodeData;

        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const targetItem = targetShipOrderChildren[3] as TargetFieldNodeData;

        MappingActionService.engageMapping(tree, sourceItem, targetItem);

        const shipOrderFieldItem = tree.children[0] as FieldItem;
        expect(shipOrderFieldItem).toBeInstanceOf(FieldItem);

        const forEachItem = shipOrderFieldItem.children.find((c) => c instanceof ForEachItem) as ForEachItem;
        expect(forEachItem).toBeDefined();
        expect(forEachItem.expression).toBe('/ns0:ShipOrder/Item');

        const innerFieldItem = forEachItem.children.find((c) => c instanceof FieldItem) as FieldItem;
        expect(innerFieldItem).toBeDefined();
        expect(innerFieldItem.field.name).toBe('Item');

        const copyOf = innerFieldItem.children.find((c) => c instanceof ValueSelector) as ValueSelector;
        expect(copyOf).toBeDefined();
        expect(copyOf.expression).toBe('.');
      });

      it('should place ForEachItem with inner FieldItem when collections have different names', () => {
        const orderInfoDef = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          BODY_DOCUMENT_ID,
          { 'OrderInfo.xsd': getOrderInfoXsd() },
        );
        const orderInfoResult = XmlSchemaDocumentService.createXmlSchemaDocument(orderInfoDef);
        expect(orderInfoResult.validationStatus).toBe('success');
        const orderInfoDoc = orderInfoResult.document!;
        const orderInfoDocNode = new DocumentNodeData(orderInfoDoc);

        const orderInfoDocChildren = VisualizationService.generateStructuredDocumentChildren(orderInfoDocNode);
        const orderInfoChildren = VisualizationService.generateNonDocumentNodeDataChildren(orderInfoDocChildren[0]);
        const sourceOrderEntry = orderInfoChildren[0] as FieldNodeData;

        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const targetItem = targetShipOrderChildren[3] as TargetFieldNodeData;

        MappingActionService.engageMapping(tree, sourceOrderEntry, targetItem);

        const shipOrderFieldItem = tree.children[0] as FieldItem;
        expect(shipOrderFieldItem).toBeInstanceOf(FieldItem);

        const forEachItem = shipOrderFieldItem.children.find((c) => c instanceof ForEachItem) as ForEachItem;
        expect(forEachItem).toBeDefined();
        expect(forEachItem.expression).toContain('OrderEntry');

        const innerFieldItem = forEachItem.children.find((c) => c instanceof FieldItem) as FieldItem;
        expect(innerFieldItem).toBeDefined();
        expect(innerFieldItem.field.name).toBe('Item');

        expect(innerFieldItem.children.length).toBeGreaterThan(0);
        const titleMapping = innerFieldItem.children.find(
          (c) => c instanceof FieldItem && c.field.name === 'Title',
        ) as FieldItem;
        expect(titleMapping).toBeDefined();
      });

      it('should not create duplicate ForEachItem on repeated DnD (copy-of case)', () => {
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
        const sourceItem = sourceShipOrderChildren[3] as FieldNodeData;

        let targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const targetItem = targetShipOrderChildren[3] as TargetFieldNodeData;

        MappingActionService.engageMapping(tree, sourceItem, targetItem);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        MappingActionService.engageMapping(tree, sourceItem, targetShipOrderChildren[3] as TargetNodeData);

        const shipOrderFieldItem = tree.children[0] as FieldItem;
        const forEachItems = shipOrderFieldItem.children.filter((c) => c instanceof ForEachItem);
        expect(forEachItems).toHaveLength(1);
      });

      it('should not create duplicate ForEachItem on repeated DnD (auto-child case)', () => {
        const orderInfoDef = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          BODY_DOCUMENT_ID,
          { 'OrderInfo.xsd': getOrderInfoXsd() },
        );
        const orderInfoResult = XmlSchemaDocumentService.createXmlSchemaDocument(orderInfoDef);
        const orderInfoDoc = orderInfoResult.document!;
        const orderInfoDocNode = new DocumentNodeData(orderInfoDoc);

        const orderInfoDocChildren = VisualizationService.generateStructuredDocumentChildren(orderInfoDocNode);
        const orderInfoChildren = VisualizationService.generateNonDocumentNodeDataChildren(orderInfoDocChildren[0]);
        const sourceOrderEntry = orderInfoChildren[0] as FieldNodeData;

        let targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const targetItem = targetShipOrderChildren[3] as TargetFieldNodeData;

        MappingActionService.engageMapping(tree, sourceOrderEntry, targetItem);

        targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        MappingActionService.engageMapping(tree, sourceOrderEntry, targetShipOrderChildren[3] as TargetNodeData);

        const shipOrderFieldItem = tree.children[0] as FieldItem;
        const forEachItems = shipOrderFieldItem.children.filter((c) => c instanceof ForEachItem);
        expect(forEachItems).toHaveLength(1);
      });

      it('should create a separate ForEachItem for each repeating sibling (reproducible with ADT_IN.xsd)', () => {
        const adtXsd = getAdtInXsd();
        const srcDoc = XmlSchemaDocumentService.createXmlSchemaDocument(
          new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, BODY_DOCUMENT_ID, {
            'ADT_IN.xsd': adtXsd,
          }),
        ).document!;
        const tgtDoc = XmlSchemaDocumentService.createXmlSchemaDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, BODY_DOCUMENT_ID, {
            'ADT_IN.xsd': adtXsd,
          }),
        ).document!;
        const hl7Tree = new MappingTree(tgtDoc.documentType, tgtDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
        const tgtDocNode = new TargetDocumentNodeData(tgtDoc, hl7Tree);

        const srcChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          VisualizationService.generateStructuredDocumentChildren(new DocumentNodeData(srcDoc))[0],
        );
        const findSrc = (name: string) =>
          srcChildren.find((n) => (n as FieldNodeData).field?.name === name) as FieldNodeData;
        const findTgt = (name: string) =>
          VisualizationService.generateNonDocumentNodeDataChildren(
            VisualizationService.generateStructuredDocumentChildren(tgtDocNode)[0],
          ).find((n) => n instanceof TargetFieldNodeData && n.field.name === name) as TargetNodeData;

        const first = MappingActionService.engageMapping(hl7Tree, findSrc('NK1Loop'), findTgt('NK1Loop'));
        const second = MappingActionService.engageMapping(hl7Tree, findSrc('OBXLoop'), findTgt('OBXLoop'));

        expect(first).toBe(true);
        expect(second).toBe(true);
        const hl7Item = hl7Tree.children[0] as FieldItem;
        const forEachItems = hl7Item.children.filter((c) => c instanceof ForEachItem) as ForEachItem[];
        expect(forEachItems).toHaveLength(2);
        const wrappedNames = forEachItems.map((f) => (f.children[0] as FieldItem).field.name);
        expect(wrappedNames).toEqual(['NK1Loop', 'OBXLoop']);
      });
    });

    describe('sibling collection loops', () => {
      const ROOT_XSD = (children: string) => `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Root">
    <xs:complexType>
      <xs:sequence>${children}</xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
      const REPEATING = (name: string) =>
        `<xs:element name="${name}" maxOccurs="unbounded"><xs:complexType><xs:sequence>` +
        `<xs:element name="Value" type="xs:string"/></xs:sequence></xs:complexType></xs:element>`;

      const createDoc = (type: DocumentType, xsd: string) => {
        const definition = new DocumentDefinition(type, DocumentDefinitionType.XML_SCHEMA, BODY_DOCUMENT_ID, {
          'Root.xsd': xsd,
        });
        return XmlSchemaDocumentService.createXmlSchemaDocument(definition).document!;
      };

      const dropCollection = (
        srcDoc: XmlSchemaDocument,
        tgtDoc: XmlSchemaDocument,
        tgtTree: MappingTree,
        name: string,
      ) => {
        const srcChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          VisualizationService.generateStructuredDocumentChildren(new DocumentNodeData(srcDoc))[0],
        );
        const tgtChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          VisualizationService.generateStructuredDocumentChildren(new TargetDocumentNodeData(tgtDoc, tgtTree))[0],
        );
        MappingActionService.engageMapping(
          tgtTree,
          srcChildren.find((c) => c instanceof FieldNodeData && c.field.name === name) as FieldNodeData,
          tgtChildren.find((c) => c instanceof TargetFieldNodeData && c.field.name === name) as TargetNodeData,
        );
      };

      it.each([
        ['target order', ['Address', 'Phone']],
        ['reverse of target order', ['Phone', 'Address']],
      ])('should keep for-each loops in target sequence order when dropped in %s', (_label, dropOrder) => {
        const xsd = ROOT_XSD(REPEATING('Address') + REPEATING('Phone'));
        const srcDoc = createDoc(DocumentType.SOURCE_BODY, xsd);
        const tgtDoc = createDoc(DocumentType.TARGET_BODY, xsd);
        const tgtTree = new MappingTree(tgtDoc.documentType, tgtDoc.documentId, DocumentDefinitionType.XML_SCHEMA);

        for (const name of dropOrder) dropCollection(srcDoc, tgtDoc, tgtTree, name);

        const rootItem = tgtTree.children[0] as FieldItem;
        const loops = rootItem.children.filter((c) => c instanceof ForEachItem) as ForEachItem[];
        expect(loops).toHaveLength(2);
        expect(loops.map((l) => l.expression)).toEqual([
          expect.stringContaining('Address'),
          expect.stringContaining('Phone'),
        ]);
        const mappedFields = loops.map((loop) => loop.children[0] as FieldItem);
        expect(mappedFields.map((field) => field.field.name)).toEqual(['Address', 'Phone']);
        expect(mappedFields.every((field) => field.children.length > 0)).toBe(true);

        const xslt = MappingSerializerService.serialize(tgtTree, new Map());
        for (const loop of loops) {
          expect(xslt).toContain(`select="${loop.expression}"`);
        }
        expect(xslt.indexOf('Address')).toBeGreaterThan(-1);
        expect(xslt.indexOf('Address')).toBeLessThan(xslt.indexOf('Phone'));
      });

      it.each([
        ['target order', ['Address', 'Fax', 'Phone']],
        ['reverse of target order', ['Phone', 'Fax', 'Address']],
        ['middle inserted last', ['Address', 'Phone', 'Fax']],
        ['middle inserted first', ['Fax', 'Phone', 'Address']],
      ])('should keep three for-each loops in target sequence order when dropped in %s', (_label, dropOrder) => {
        const xsd = ROOT_XSD(REPEATING('Address') + REPEATING('Fax') + REPEATING('Phone'));
        const srcDoc = createDoc(DocumentType.SOURCE_BODY, xsd);
        const tgtDoc = createDoc(DocumentType.TARGET_BODY, xsd);
        const tgtTree = new MappingTree(tgtDoc.documentType, tgtDoc.documentId, DocumentDefinitionType.XML_SCHEMA);

        for (const name of dropOrder) dropCollection(srcDoc, tgtDoc, tgtTree, name);

        const rootItem = tgtTree.children[0] as FieldItem;
        const loops = rootItem.children.filter((c) => c instanceof ForEachItem) as ForEachItem[];
        expect(loops.map((loop) => (loop.children[0] as FieldItem).field.name)).toEqual(['Address', 'Fax', 'Phone']);
      });

      it('should remove the stray field item when a sibling for-each already wraps the same field', () => {
        const xsd = ROOT_XSD(REPEATING('Address') + REPEATING('Phone'));
        const srcDoc = createDoc(DocumentType.SOURCE_BODY, xsd);
        const tgtDoc = createDoc(DocumentType.TARGET_BODY, xsd);
        const tgtTree = new MappingTree(tgtDoc.documentType, tgtDoc.documentId, DocumentDefinitionType.XML_SCHEMA);

        dropCollection(srcDoc, tgtDoc, tgtTree, 'Address');
        dropCollection(srcDoc, tgtDoc, tgtTree, 'Phone');
        // The UI exposes the loop-wrapped Address as a different node type, so build a plain, unmapped
        // target node by hand. Dropping on it creates a stray FieldItem next to the existing loop,
        // which the guard must discard.
        const srcChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          VisualizationService.generateStructuredDocumentChildren(new DocumentNodeData(srcDoc))[0],
        );
        const tgtRootNode = VisualizationService.generateStructuredDocumentChildren(
          new TargetDocumentNodeData(tgtDoc, tgtTree),
        )[0] as TargetFieldNodeData;
        const addressField = tgtRootNode.field.fields.find((f) => f.name === 'Address')!;
        const strayNode = new TargetFieldNodeData(tgtRootNode, addressField);
        MappingActionService.engageMapping(
          tgtTree,
          srcChildren.find((c) => c instanceof FieldNodeData && c.field.name === 'Address') as FieldNodeData,
          strayNode,
        );

        const rootItem = tgtTree.children[0] as FieldItem;
        expect(rootItem.children.every((c) => c instanceof ForEachItem)).toBe(true);
        const loops = rootItem.children as ForEachItem[];
        expect(loops.map((loop) => (loop.children[0] as FieldItem).field.name)).toEqual(['Address', 'Phone']);
      });
    });

    describe('auto-optional-if (drag/drop engagement)', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      function sourceShipOrderChildren() {
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        return VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
      }
      function targetShipOrderChildren() {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        return VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
      }
      function findByName(children: NodeData[], name: string) {
        return children.find((c) => 'field' in c && (c.field as IField).name === name);
      }
      function findIfNode(children: NodeData[]) {
        return children.find((c) => c instanceof MappingNodeData && c.mapping instanceof IfItem) as MappingNodeData;
      }
      function sourceItemField(name: string) {
        const sourceItem = findByName(sourceShipOrderChildren(), 'Item') as FieldNodeData;
        return findByName(VisualizationService.generateNonDocumentNodeDataChildren(sourceItem), name) as FieldNodeData;
      }
      function targetItemChildren(renderIndex: TargetRenderIndex) {
        const shipOrderNode = VisualizationService.generateStructuredDocumentChildren(
          new TargetDocumentNodeData(targetDoc, tree, renderIndex),
        )[0];
        const forEachNode = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderNode).find(
          (c) => c instanceof MappingNodeData && c.mapping instanceof ForEachItem,
        ) as MappingNodeData;
        const itemNode = VisualizationService.generateNonDocumentNodeDataChildren(forEachNode)[0];
        return VisualizationService.generateNonDocumentNodeDataChildren(itemNode);
      }
      function targetItemFieldItem() {
        const shipOrderFieldItem = tree.children[0] as FieldItem;
        const forEachItem = shipOrderFieldItem.children.find((c) => c instanceof ForEachItem) as ForEachItem;
        return forEachItem.children[0] as FieldItem;
      }
      function dropNoteIntoItemLoop() {
        MappingActionService.engageMapping(
          tree,
          findByName(sourceShipOrderChildren(), 'Item') as FieldNodeData,
          findByName(targetShipOrderChildren(), 'Item') as TargetFieldNodeData,
        );
        return MappingActionService.engageMapping(
          tree,
          sourceItemField('Note'),
          findByName(targetItemChildren(buildRenderIndex()), 'Note') as TargetFieldNodeData,
        );
      }
      function setUpAdtIn() {
        const createDocument = (documentType: DocumentType) =>
          XmlSchemaDocumentService.createXmlSchemaDocument(
            new DocumentDefinition(documentType, DocumentDefinitionType.XML_SCHEMA, BODY_DOCUMENT_ID, {
              'ADT_IN.xsd': getAdtInXsd(),
            }),
          ).document!;
        const adtSourceDoc = createDocument(DocumentType.SOURCE_BODY);
        const adtTargetDoc = createDocument(DocumentType.TARGET_BODY);
        const adtTree = new MappingTree(
          adtTargetDoc.documentType,
          adtTargetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const hl7Children = (documentNode: DocumentNodeData) =>
          VisualizationService.generateNonDocumentNodeDataChildren(
            VisualizationService.generateStructuredDocumentChildren(documentNode)[0],
          );
        return {
          adtTargetDoc,
          adtTree,
          sourceField: (name: string) =>
            findByName(hl7Children(new DocumentNodeData(adtSourceDoc)), name) as FieldNodeData,
          targetNode: (name: string, renderIndex: TargetRenderIndex = TargetRenderIndex.EMPTY) =>
            findByName(hl7Children(new TargetDocumentNodeData(adtTargetDoc, adtTree, renderIndex)), name) as
              | TargetFieldNodeData
              | FieldItemNodeData,
          buildRenderIndex: () => buildRenderIndex(adtTree, adtSourceDoc),
        };
      }

      it('should guard an optional terminal field drop with an if the render index shows see-through', () => {
        const structural = dropNoteIntoItemLoop();

        const ifItem = targetItemFieldItem().children.find((c) => c instanceof IfItem) as IfItem;
        expect(structural).toBe(true);
        expect(ifItem.expression).toBe('Note');
        expect((ifItem.children[0] as FieldItem).field.name).toBe('Note');
        const renderIndex = buildRenderIndex();
        expect(renderIndex.isAbsorbed(ifItem)).toBe(true);
        const noteNode = findByName(targetItemChildren(renderIndex), 'Note') as FieldItemNodeData;
        expect(noteNode.autoOptionalIfItem).toBe(ifItem);
      });

      it.each([
        ['the same source', 'Note', 'Note, Note'],
        ['a different source', 'Title', 'Note, Title'],
      ])(
        'should report a drop of %s onto a guarded field as structural and show the guard as a regular if',
        (_label, sourceName, expectedExpression) => {
          dropNoteIntoItemLoop();
          const renderIndex = buildRenderIndex();
          const ifItem = targetItemFieldItem().children.find((c) => c instanceof IfItem) as IfItem;
          const noteNode = findByName(targetItemChildren(renderIndex), 'Note') as FieldItemNodeData;
          expect(noteNode.autoOptionalIfItem).toBe(ifItem);

          const structural = MappingActionService.engageMapping(tree, sourceItemField(sourceName), noteNode);

          expect(structural).toBe(true);
          expect(ifItem.children).toEqual([noteNode.mapping]);
          expect((noteNode.mapping.children[0] as ValueSelector).expression).toBe(expectedExpression);
          expect(buildRenderIndex().isAbsorbed(ifItem)).toBe(false);
        },
      );

      it.each<[string, () => SourceNodeDataType]>([
        ['a variable', () => new SourceVariableNodeData(new VariableItem(tree, 'myVar'))],
        [
          'a selected choice member',
          () => {
            const title = sourceItemField('Title');
            const member = new ChoiceFieldNodeData(title.parent, title.field);
            member.choiceField = title.field;
            return member;
          },
        ],
      ])('should report a drop of %s onto a guarded field as structural', (_label, createSourceNode) => {
        dropNoteIntoItemLoop();
        const renderIndex = buildRenderIndex();
        const ifItem = targetItemFieldItem().children.find((c) => c instanceof IfItem) as IfItem;
        const noteNode = findByName(targetItemChildren(renderIndex), 'Note') as FieldItemNodeData;
        expect(noteNode.autoOptionalIfItem).toBe(ifItem);

        const structural = MappingActionService.engageMapping(tree, createSourceNode(), noteNode);

        expect(structural).toBe(true);
        expect(ifItem.children).toEqual([noteNode.mapping]);
        expect(buildRenderIndex().isAbsorbed(ifItem)).toBe(false);
      });

      it('should report a drop onto the for-each row as structural when it changes how a guard in the loop resolves', () => {
        dropNoteIntoItemLoop();
        const renderIndex = buildRenderIndex();
        const ifItem = targetItemFieldItem().children.find((c) => c instanceof IfItem) as IfItem;
        expect(renderIndex.isAbsorbed(ifItem)).toBe(true);
        const shipOrderNode = VisualizationService.generateStructuredDocumentChildren(
          new TargetDocumentNodeData(targetDoc, tree, renderIndex),
        )[0];
        const forEachNode = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderNode).find(
          (c) => c instanceof MappingNodeData && c.mapping instanceof ForEachItem,
        ) as MappingNodeData;

        const structural = MappingActionService.engageMapping(
          tree,
          findByName(sourceShipOrderChildren(), 'ShipTo') as FieldNodeData,
          forEachNode,
        );

        expect(structural).toBe(true);
        expect(buildRenderIndex().isAbsorbed(ifItem)).toBe(false);
      });

      it('should keep a user if visible and not report a drop of a required source onto its row as structural', () => {
        const itemFieldItem = buildItemLoop();
        mapField(itemFieldItem, childField(itemFieldItem.field, 'Note'), 'Title');
        MappingActionService.applyIf(findByName(targetItemChildren(buildRenderIndex()), 'Note') as FieldItemNodeData);
        const renderIndex = buildRenderIndex();
        const ifNode = findIfNode(targetItemChildren(renderIndex));
        const ifItem = ifNode.mapping as IfItem;
        expect(renderIndex.isAbsorbed(ifItem)).toBe(false);

        const structural = MappingActionService.engageMapping(tree, sourceItemField('Title'), ifNode);

        expect(structural).toBe(false);
        expect(ifItem.expression).toBe('Title');
        expectNoDecisionChange(tree, renderIndex);
      });

      it('should clear the container copy-of when re-mapping a child that sits under a guard', () => {
        const sourceShipTo = sourceDoc.fields[0].fields.find((f) => f.name === 'ShipTo')!;
        const targetShipTo = targetDoc.fields[0].fields.find((f) => f.name === 'ShipTo')!;
        const sourceName = sourceShipTo.fields.find((f) => f.name === 'Name')!;
        const targetName = targetShipTo.fields.find((f) => f.name === 'Name')!;
        sourceName.minOccurs = 0;
        targetName.minOccurs = 0;

        const sourceShipToChildren = () =>
          VisualizationService.generateNonDocumentNodeDataChildren(
            findByName(sourceShipOrderChildren(), 'ShipTo') as FieldNodeData,
          );
        // Name's node moves under the guard's node once it is wrapped, so look a level deeper.
        const targetNameNode = () => {
          const shipToChildren = VisualizationService.generateNonDocumentNodeDataChildren(
            findByName(targetShipOrderChildren(), 'ShipTo') as TargetFieldNodeData,
          );
          const nested = shipToChildren.flatMap((c) => VisualizationService.generateNonDocumentNodeDataChildren(c));
          return (findByName(shipToChildren, 'Name') ?? findByName(nested, 'Name')) as TargetFieldNodeData;
        };

        // Guard the child first, then give the container a wholesale copy-of.
        MappingActionService.engageMapping(
          tree,
          findByName(sourceShipToChildren(), 'Name') as FieldNodeData,
          targetNameNode(),
        );
        MappingActionService.engageMapping(
          tree,
          findByName(sourceShipOrderChildren(), 'ShipTo') as FieldNodeData,
          findByName(targetShipOrderChildren(), 'ShipTo') as TargetFieldNodeData,
        );
        const shipOrderFieldItem = tree.children[0] as FieldItem;
        const shipToItem = shipOrderFieldItem.children.find(
          (c) => c instanceof FieldItem && c.field.name === 'ShipTo',
        ) as FieldItem;
        expect(shipToItem.children.some((c) => c instanceof CopyOfSelector)).toBe(true);

        // Re-drop onto the guarded child: the container copy-of has to go, or the output both
        // copies the subtree and emits Name explicitly. The guard is in the way of finding it.
        MappingActionService.engageMapping(
          tree,
          findByName(sourceShipToChildren(), 'City') as FieldNodeData,
          targetNameNode(),
        );

        expect(shipToItem.children.some((c) => c instanceof CopyOfSelector)).toBe(false);
      });

      it('should report a drop onto the copy-of row of a guarded field as structural', () => {
        const adt = setUpAdtIn();
        const hl7Field = adt.adtTargetDoc.fields[0];
        const hl7Item = new FieldItem(adt.adtTree, hl7Field);
        adt.adtTree.children.push(hl7Item);
        const ifItem = new IfItem(hl7Item);
        ifItem.expression = '/HL7/PID';
        hl7Item.children.push(ifItem);
        const pidItem = new FieldItem(ifItem, childField(hl7Field, 'PID'));
        ifItem.children.push(pidItem);
        const copyOf = new CopyOfSelector(pidItem, CopyOfType.CONTAINER_NODE);
        copyOf.expression = '/HL7/PID/node()';
        pidItem.children.push(copyOf);
        const renderIndex = adt.buildRenderIndex();
        const pidNode = adt.targetNode('PID', renderIndex) as FieldItemNodeData;
        const copyOfNode = VisualizationService.generateNonDocumentNodeDataChildren(pidNode).find(
          (n) => 'mapping' in n && n.mapping === copyOf,
        ) as MappingNodeData;
        expect(pidNode.autoOptionalIfItem).toBe(ifItem);
        expect(copyOfNode.mapping).toBe(copyOf);

        const structural = MappingActionService.engageMapping(adt.adtTree, adt.sourceField('PID'), copyOfNode);

        expect(structural).toBe(true);
        expect(copyOf.expression).toBe('/HL7/PID/node(), /HL7/PID');
        expect(adt.buildRenderIndex().isAbsorbed(ifItem)).toBe(false);
      });

      it('should report a drop onto a field under a visible if as structural once the if matches it', () => {
        MappingActionService.engageMapping(
          tree,
          findByName(sourceShipOrderChildren(), 'Item') as FieldNodeData,
          findByName(targetShipOrderChildren(), 'Item') as TargetFieldNodeData,
        );
        MappingActionService.applyIf(findByName(targetItemChildren(buildRenderIndex()), 'Note') as TargetFieldNodeData);
        const ifTestIndex = buildRenderIndex();
        const ifNode = findIfNode(targetItemChildren(ifTestIndex));
        const ifItem = ifNode.mapping as IfItem;

        const ifTestStructural = MappingActionService.engageMapping(tree, sourceItemField('Note'), ifNode);

        expect(ifTestStructural).toBe(false);
        expect(ifItem.expression).toBe('Note');
        expectNoDecisionChange(tree, ifTestIndex);

        const renderIndex = buildRenderIndex();
        const noteNode = VisualizationService.generateNonDocumentNodeDataChildren(
          findIfNode(targetItemChildren(renderIndex)),
        )[0] as FieldItemNodeData;
        expect(renderIndex.isAbsorbed(ifItem)).toBe(false);

        const structural = MappingActionService.engageMapping(tree, sourceItemField('Note'), noteNode);

        expect(structural).toBe(true);
        expect(ifItem.expression).toBe('Note');
        expect(buildRenderIndex().isAbsorbed(ifItem)).toBe(true);
      });

      it('should not report a drop onto an if row whose test stays ineligible as structural', () => {
        const itemFieldItem = buildItemLoop();
        const ifItem = new IfItem(itemFieldItem);
        ifItem.expression = "Note != ''";
        itemFieldItem.children.push(ifItem);
        mapField(ifItem, childField(itemFieldItem.field, 'Note'), 'Note');
        const renderIndex = buildRenderIndex();
        const ifNode = findIfNode(targetItemChildren(renderIndex));

        const structural = MappingActionService.engageMapping(tree, sourceItemField('Note'), ifNode);

        expect(structural).toBe(false);
        expect(ifItem.expression).toBe("Note != '', Note");
        expectNoDecisionChange(tree, renderIndex);
      });

      it('should not guard a field that is already mapped from a required source', () => {
        const sourceOrderId = sourceDoc.fields[0].fields.find((f) => f.name === 'OrderId')!;
        const sourceOrderPerson = sourceDoc.fields[0].fields.find((f) => f.name === 'OrderPerson')!;
        const targetOrderPerson = targetDoc.fields[0].fields.find((f) => f.name === 'OrderPerson')!;
        sourceOrderId.minOccurs = 1;
        sourceOrderPerson.minOccurs = 0;
        targetOrderPerson.minOccurs = 0;

        MappingActionService.engageMapping(
          tree,
          findByName(sourceShipOrderChildren(), 'OrderId') as FieldNodeData,
          findByName(targetShipOrderChildren(), 'OrderPerson') as TargetFieldNodeData,
        );
        MappingActionService.engageMapping(
          tree,
          findByName(sourceShipOrderChildren(), 'OrderPerson') as FieldNodeData,
          findByName(targetShipOrderChildren(), 'OrderPerson') as TargetFieldNodeData,
        );

        // Guarding here would gate the required source's output on the optional source's presence.
        const shipOrderFieldItem = tree.children[0] as FieldItem;
        expect(shipOrderFieldItem.children.some((c) => c instanceof IfItem)).toBe(false);
      });

      it('should guard an optional container field drop (copy-of) with an if the render index shows see-through', () => {
        const adt = setUpAdtIn();

        const structural = MappingActionService.engageMapping(
          adt.adtTree,
          adt.sourceField('PID'),
          adt.targetNode('PID'),
        );

        const hl7Item = adt.adtTree.children[0] as FieldItem;
        const ifItem = hl7Item.children.find((c) => c instanceof IfItem) as IfItem;
        expect(structural).toBe(true);
        expect(ifItem.expression).toBe('/HL7/PID');
        const fieldItem = ifItem.children.find((c) => c instanceof FieldItem) as FieldItem;
        expect(fieldItem.field.name).toBe('PID');
        expect(
          fieldItem.children.some((c) => c instanceof CopyOfSelector && c.valueType === CopyOfType.CONTAINER),
        ).toBe(true);
        expect(adt.buildRenderIndex().isAbsorbed(ifItem)).toBe(true);
      });

      it('should guard an optional container field drop (recursive auto-children) with an if the render index keeps visible', () => {
        vi.spyOn(FieldMatchingService, 'canUseCopyOf').mockReturnValue(false);
        const adt = setUpAdtIn();

        MappingActionService.engageMapping(adt.adtTree, adt.sourceField('PID'), adt.targetNode('PID'));

        const hl7Item = adt.adtTree.children[0] as FieldItem;
        const ifItem = hl7Item.children.find((c) => c instanceof IfItem) as IfItem;
        const fieldItem = ifItem.children.find((c) => c instanceof FieldItem) as FieldItem;
        expect(fieldItem.field.name).toBe('PID');
        expect(fieldItem.soleSelector).toBeUndefined();
        expect(fieldItem.children.length).toBeGreaterThan(0);
        expect(adt.buildRenderIndex().isAbsorbed(ifItem)).toBe(false);
      });

      it('should NOT wrap when the source field is required even though the target is optional', () => {
        const sourceOrderPerson = sourceDoc.fields[0].fields.find((f) => f.name === 'OrderPerson')!;
        const targetOrderPerson = targetDoc.fields[0].fields.find((f) => f.name === 'OrderPerson')!;
        sourceOrderPerson.minOccurs = 1;
        targetOrderPerson.minOccurs = 0;

        const sourceItem = findByName(sourceShipOrderChildren(), 'OrderPerson') as FieldNodeData;
        const targetItem = findByName(targetShipOrderChildren(), 'OrderPerson') as TargetFieldNodeData;

        MappingActionService.engageMapping(tree, sourceItem, targetItem);

        const shipOrderFieldItem = tree.children[0] as FieldItem;
        expect(shipOrderFieldItem.children.some((c) => c instanceof IfItem)).toBe(false);
        expect(shipOrderFieldItem.children.some((c) => c instanceof FieldItem && c.field.name === 'OrderPerson')).toBe(
          true,
        );
      });

      it('should NOT wrap when the target field is required even though the source is optional', () => {
        const sourceOrderPerson = sourceDoc.fields[0].fields.find((f) => f.name === 'OrderPerson')!;
        const targetOrderPerson = targetDoc.fields[0].fields.find((f) => f.name === 'OrderPerson')!;
        sourceOrderPerson.minOccurs = 0;
        targetOrderPerson.minOccurs = 1;

        const sourceItem = findByName(sourceShipOrderChildren(), 'OrderPerson') as FieldNodeData;
        const targetItem = findByName(targetShipOrderChildren(), 'OrderPerson') as TargetFieldNodeData;

        MappingActionService.engageMapping(tree, sourceItem, targetItem);

        const shipOrderFieldItem = tree.children[0] as FieldItem;
        expect(shipOrderFieldItem.children.some((c) => c instanceof IfItem)).toBe(false);
        expect(shipOrderFieldItem.children.some((c) => c instanceof FieldItem && c.field.name === 'OrderPerson')).toBe(
          true,
        );
      });

      it('should guard each optional child independently inside an optional container that is guarded itself', () => {
        vi.spyOn(FieldMatchingService, 'canUseCopyOf').mockReturnValue(false);
        const adt = setUpAdtIn();

        MappingActionService.engageMapping(adt.adtTree, adt.sourceField('PID'), adt.targetNode('PID'));

        const hl7Item = adt.adtTree.children[0] as FieldItem;
        const pidIfItem = hl7Item.children.find((c) => c instanceof IfItem) as IfItem;
        const pidFieldItem = pidIfItem.children[0] as FieldItem;
        const fieldIfItem = pidFieldItem.children[0] as IfItem;
        const fieldFieldItem = fieldIfItem.children[0] as FieldItem;
        const componentIfItem = fieldFieldItem.children[0] as IfItem;
        expect(fieldFieldItem.field.name).toBe('field_01');
        expect(componentIfItem.expression).toBe('/HL7/PID/field_01/comp_01');
        const renderIndex = adt.buildRenderIndex();
        expect(renderIndex.isAbsorbed(pidIfItem)).toBe(false);
        expect(renderIndex.isAbsorbed(fieldIfItem)).toBe(false);
        expect(renderIndex.isAbsorbed(componentIfItem)).toBe(true);
      });

      it('should create a ForEach for optional collection-to-collection mapping without any additional xsl:if', () => {
        const sourceItemField = sourceDoc.fields[0].fields.find((f) => f.name === 'Item')!;
        const targetItemField = targetDoc.fields[0].fields.find((f) => f.name === 'Item')!;
        sourceItemField.minOccurs = 0;
        targetItemField.minOccurs = 0;

        const sourceItem = findByName(sourceShipOrderChildren(), 'Item') as FieldNodeData;
        const targetItem = findByName(targetShipOrderChildren(), 'Item') as TargetFieldNodeData;

        MappingActionService.engageMapping(tree, sourceItem, targetItem);

        const shipOrderFieldItem = tree.children[0] as FieldItem;
        expect(shipOrderFieldItem.children.some((c) => c instanceof IfItem)).toBe(false);
        const forEachItem = shipOrderFieldItem.children.find((c) => c instanceof ForEachItem) as ForEachItem;
        expect(forEachItem).toBeDefined();
      });

      it('should wrap an optional child inside a ForEach iteration while leaving required siblings unwrapped', () => {
        // OrderInfo's OrderEntry.Note and ShipOrder's Item.Note are both minOccurs=0 by schema
        // default; Title/Quantity/Price on both sides are required.
        const orderInfoDef = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          BODY_DOCUMENT_ID,
          { 'OrderInfo.xsd': getOrderInfoXsd() },
        );
        const orderInfoResult = XmlSchemaDocumentService.createXmlSchemaDocument(orderInfoDef);
        const orderInfoDoc = orderInfoResult.document!;
        const orderInfoDocNode = new DocumentNodeData(orderInfoDoc);

        const orderInfoDocChildren = VisualizationService.generateStructuredDocumentChildren(orderInfoDocNode);
        const orderInfoChildren = VisualizationService.generateNonDocumentNodeDataChildren(orderInfoDocChildren[0]);
        const sourceOrderEntry = orderInfoChildren[0] as FieldNodeData;

        const targetItem = findByName(targetShipOrderChildren(), 'Item') as TargetFieldNodeData;

        MappingActionService.engageMapping(tree, sourceOrderEntry, targetItem);

        const shipOrderFieldItem = tree.children[0] as FieldItem;
        const forEachItem = shipOrderFieldItem.children.find((c) => c instanceof ForEachItem) as ForEachItem;
        const innerFieldItem = forEachItem.children.find((c) => c instanceof FieldItem) as FieldItem;

        const noteIfItem = innerFieldItem.children.find(
          (c) => c instanceof IfItem && (c.children[0] as FieldItem)?.field.name === 'Note',
        ) as IfItem;
        expect(noteIfItem).toBeDefined();
        expect(buildRenderIndex(tree, orderInfoDoc).isAbsorbed(noteIfItem)).toBe(true);

        expect(innerFieldItem.children.some((c) => c instanceof FieldItem && c.field.name === 'Title')).toBe(true);
        expect(
          innerFieldItem.children.some(
            (c) => c instanceof IfItem && (c.children[0] as FieldItem)?.field.name === 'Title',
          ),
        ).toBe(false);
      });
    });

    describe('engageMapping() with SourceVariableNodeData', () => {
      it('should create VALUE mapping for select-form variable to document', () => {
        const variable = new VariableItem(tree, 'myVar');
        tree.children.push(variable);
        const sourceNode = new SourceVariableNodeData(variable);

        MappingActionService.engageMapping(tree, sourceNode, targetDocNode);

        const vs = tree.children.find((c) => c instanceof ValueSelector) as ValueSelector;
        expect(vs).toBeDefined();
        expect(vs.expression).toBe('$myVar');
      });

      it('should create mapping for content-form variable to document', () => {
        const variable = new VariableItem(tree, 'contentVar');
        variable.children.push(new FieldItem(variable, targetDoc.fields[0]));
        tree.children.push(variable);
        const sourceNode = new SourceVariableNodeData(variable);

        MappingActionService.engageMapping(tree, sourceNode, targetDocNode);

        const vs = tree.children.find((c) => c instanceof ValueSelector) as ValueSelector;
        expect(vs).toBeDefined();
        expect(vs.expression).toBe('$contentVar');
      });

      it('should create mapping for variable to a target field', () => {
        const sourceNode = new SourceVariableNodeData(new VariableItem(tree, 'myVar'));
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        MappingActionService.engageMapping(tree, sourceNode, targetShipOrderChildren[1] as TargetNodeData);

        const rootFieldItem = tree.children[0] as FieldItem;
        expect(rootFieldItem).toBeInstanceOf(FieldItem);
        const vs = rootFieldItem.children[0].children[0] as ValueSelector;
        expect(vs.expression).toBe('$myVar');
      });
    });

    describe('xs:anyType container mapping', () => {
      it('should create copy-of with CONTAINER_NODE when xs:anyType source is mapped to a container target', () => {
        const anyTypeDef = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          BODY_DOCUMENT_ID,
          { 'Envelope.xsd': getEnvelopeXsd() },
        );
        const anyTypeResult = XmlSchemaDocumentService.createXmlSchemaDocument(anyTypeDef);
        expect(anyTypeResult.validationStatus).toBe('success');
        const anyTypeDoc = anyTypeResult.document!;
        const anyTypeDocNode = new DocumentNodeData(anyTypeDoc);

        const anyTypeDocChildren = VisualizationService.generateStructuredDocumentChildren(anyTypeDocNode);
        const envelopeChildren = VisualizationService.generateNonDocumentNodeDataChildren(anyTypeDocChildren[0]);
        const payloadField = envelopeChildren[0] as FieldNodeData;
        expect(payloadField.title).toBe('Payload');

        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const targetShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const targetItem = targetShipOrderChildren[3] as TargetFieldNodeData;
        expect(targetItem.title).toBe('Item');

        MappingActionService.engageMapping(tree, payloadField, targetItem);

        const shipOrderFieldItem = tree.children[0] as FieldItem;
        expect(shipOrderFieldItem).toBeInstanceOf(FieldItem);

        const itemFieldItem = shipOrderFieldItem.children.find(
          (c) => c instanceof FieldItem && c.field.name === 'Item',
        ) as FieldItem;
        expect(itemFieldItem).toBeDefined();

        const copyOf = itemFieldItem.children.find((c) => c instanceof CopyOfSelector) as CopyOfSelector;
        expect(copyOf).toBeDefined();
        expect(copyOf.valueType).toEqual(CopyOfType.CONTAINER_NODE);
        expect(copyOf.expression).toMatch(/\/node\(\)$/);
      });
    });

    describe('xs:anyType …/node() copy-of placement', () => {
      it('should keep the dragged node() copy-of as a separate node inside its wrapper and round-trip it unchanged', () => {
        const anyTypeDef = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          BODY_DOCUMENT_ID,
          { 'Envelope.xsd': getEnvelopeXsd() },
        );
        const anyTypeDoc = XmlSchemaDocumentService.createXmlSchemaDocument(anyTypeDef).document!;
        const anyTypeDocChildren = VisualizationService.generateStructuredDocumentChildren(
          new DocumentNodeData(anyTypeDoc),
        );
        const payloadField = VisualizationService.generateNonDocumentNodeDataChildren(
          anyTypeDocChildren[0],
        )[0] as FieldNodeData;
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const targetItem = VisualizationService.generateNonDocumentNodeDataChildren(
          targetDocChildren[0],
        )[3] as TargetFieldNodeData;

        MappingActionService.engageMapping(tree, payloadField, targetItem);

        const itemFieldItem = (tree.children[0] as FieldItem).children.find(
          (c) => c instanceof FieldItem && c.field.name === 'Item',
        ) as FieldItem;
        const copyOf = itemFieldItem.children.find((c) => c instanceof CopyOfSelector) as CopyOfSelector;
        expect(
          CopyOfPlacementService.classify(copyOf.expression, itemFieldItem.field, () => '', itemFieldItem).kind,
        ).toBe('other');
        expect(CopyOfPlacementService.selectsOwnField(copyOf, itemFieldItem, () => '')).toBe(false);

        const xslt = MappingSerializerService.serialize(tree, paramsMap);
        expect(xslt).toMatch(/<Item[^>]*>\s*<xsl:copy-of select="[^"]*\/node\(\)"\/>/);

        const reloadedTree = new MappingTree(
          targetDoc.documentType,
          targetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        MappingSerializerService.deserialize(xslt, targetDoc, reloadedTree, paramsMap);
        const reloadedItem = (reloadedTree.children[0] as FieldItem).children.find(
          (c) => c instanceof FieldItem && c.field.name === 'Item',
        ) as FieldItem;
        const reloadedCopyOf = reloadedItem.children.find((c) => c instanceof CopyOfSelector) as CopyOfSelector;
        expect(reloadedCopyOf.valueType).toBe(CopyOfType.CONTAINER_NODE);
        expect(MappingSerializerService.serialize(reloadedTree, paramsMap)).toEqual(xslt);
      });
    });

    describe('XPath generation under for-each', () => {
      it('should fill ContextItemExpr (.) and AbbrevReverseStep (..) in xpath when it maps under for-each', () => {
        const orgDefinition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'Org',
          { 'Org.xsd': getOrgXsd() },
        );
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
        expect(valueSelector.expression).toBe('../../Name');

        targetPersonNameField = targetContactChildren.find(
          (child) => (child as TargetFieldNodeData).field?.name === 'PersonName',
        ) as TargetFieldNodeData;
        expect(targetPersonNameField.mapping).toBeDefined();
        valueSelector = targetPersonNameField.mapping?.children[0] as ValueSelector;
        expect(valueSelector).toBeDefined();
        expect(valueSelector.expression).toBe('../Name');

        targetEmailField = targetContactChildren.find(
          (child) => (child as TargetFieldNodeData).field?.name === 'Email',
        ) as TargetFieldNodeData;
        expect(targetEmailField.mapping).toBeDefined();
        valueSelector = targetEmailField.mapping?.children[0] as ValueSelector;
        expect(valueSelector).toBeDefined();
        expect(valueSelector.expression).toBe('.');
      });
    });
  });

  describe('addOptionalGuard()', () => {
    function toFieldItemNodeData(fieldItem: FieldItem) {
      return new FieldItemNodeData(new TargetDocumentNodeData(targetDoc, tree), fieldItem);
    }

    it('should wrap an optional field with a simple selector in a guard the render index shows see-through', () => {
      const itemFieldItem = buildItemLoop();
      const fieldItem = mapField(itemFieldItem, childField(itemFieldItem.field, 'Note'), 'Note');

      MappingActionService.addOptionalGuard(toFieldItemNodeData(fieldItem));

      expect(fieldItem.parent).toBeInstanceOf(IfItem);
      const ifItem = fieldItem.parent as IfItem;
      expect(ifItem.parent).toBe(itemFieldItem);
      expect(ifItem.expression).toBe('Note');
      expect(buildRenderIndex().isAbsorbed(ifItem)).toBe(true);
    });

    it('should not wrap a required target field', () => {
      const shipOrderItem = new FieldItem(tree, targetDoc.fields[0]);
      tree.children.push(shipOrderItem);
      const fieldItem = mapField(
        shipOrderItem,
        childField(targetDoc.fields[0], 'OrderPerson'),
        '/ns0:ShipOrder/ns0:OrderPerson',
      );

      MappingActionService.addOptionalGuard(toFieldItemNodeData(fieldItem));

      expect(fieldItem.parent).toBe(shipOrderItem);
    });

    it('should not wrap a field whose selector is not a simple path', () => {
      const itemFieldItem = buildItemLoop();
      const fieldItem = mapField(itemFieldItem, childField(itemFieldItem.field, 'Note'), "concat(Note, '!')");

      MappingActionService.addOptionalGuard(toFieldItemNodeData(fieldItem));

      expect(fieldItem.parent).toBe(itemFieldItem);
    });
  });
});
