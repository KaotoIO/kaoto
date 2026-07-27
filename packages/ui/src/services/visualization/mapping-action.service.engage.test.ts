import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
} from '../../models/datamapper/document';
import {
  CopyOfSelector,
  CopyOfType,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingTree,
  ValueSelector,
  VariableItem,
} from '../../models/datamapper/mapping';
import {
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  SourceVariableNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import {
  getContactsXsd,
  getEnvelopeXsd,
  getExtensionSimpleXsd,
  getOrderInfoXsd,
  getOrgXsd,
  getShipOrderToShipOrderInvalidForEachXslt,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { MappingActionService } from './mapping-action.service';
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
});
