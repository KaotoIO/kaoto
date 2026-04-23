import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
} from '../../models/datamapper/document';
import {
  ChooseItem,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingTree,
  ValueSelector,
  VariableItem,
} from '../../models/datamapper/mapping';
import {
  AddMappingNodeData,
  ChoiceFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  TargetDocumentNodeData,
  VariableNodeData,
} from '../../models/datamapper/visualization';
import {
  getExtensionComplexXsd,
  getExtensionSimpleXsd,
  getNestedConditionalsToShipOrderXslt,
  getSchemaTestXsd,
  getShipOrderToShipOrderCollectionIndexXslt,
  getShipOrderToShipOrderMultipleForEachXslt,
  getShipOrderToShipOrderXslt,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { VisualizationService } from './visualization.service';
import { VisualizationUtilService } from './visualization-util.service';

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

    it('should render ExtensionSimple.xsd', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'extensionSimple.xsd': getExtensionSimpleXsd() },
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
        { 'extensionComplex.xsd': getExtensionComplexXsd() },
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
        { 'schemaTest.xsd': getSchemaTestXsd() },
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

      // name, street, city, choice wrapper, createdBy, createdDate, @id, @version, @status
      expect(personChildren.length).toEqual(9);

      const nameField = personChildren.find((child) => child.title === 'name');
      expect(nameField).toBeDefined();

      const streetField = personChildren.find((child) => child.title === 'street');
      expect(streetField).toBeDefined();

      const cityField = personChildren.find((child) => child.title === 'city');
      expect(cityField).toBeDefined();

      // xs:choice is represented as a ChoiceFieldNodeData; email/phone are inside nested choice
      const outerChoiceNode = personChildren.find(
        (child) => child instanceof ChoiceFieldNodeData,
      ) as ChoiceFieldNodeData;
      expect(outerChoiceNode).toBeDefined();
      const outerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerChoiceNode);
      const innerChoiceNode = outerChoiceChildren.find(
        (child) => child instanceof ChoiceFieldNodeData,
      ) as ChoiceFieldNodeData;
      expect(innerChoiceNode).toBeDefined();
      const innerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(innerChoiceNode);
      const emailField = innerChoiceChildren.find((child) => child.title === 'email');
      expect(emailField).toBeDefined();
      const phoneField = innerChoiceChildren.find((child) => child.title === 'phone');
      expect(phoneField).toBeDefined();
      const faxField = outerChoiceChildren.find((child) => child.title === 'fax');
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
      MappingSerializerService.deserialize(getShipOrderToShipOrderXslt(), targetDoc, tree, paramsMap);
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
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
  });

  it('should generate for multiple for-each on a same collection target field', () => {
    MappingSerializerService.deserialize(getShipOrderToShipOrderMultipleForEachXslt(), targetDoc, tree, paramsMap);
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
    expect(VisualizationUtilService.isCollectionField(forEach1Children[0])).toBeTruthy();
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
    expect(VisualizationUtilService.isCollectionField(forEach2Children[0])).toBeTruthy();
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
      .spyOn(globalThis, 'crypto', 'get')
      .mockImplementation(() => ({ getRandomValues: () => [Math.random() * 10000] }) as unknown as Crypto);

    MappingSerializerService.deserialize(getShipOrderToShipOrderCollectionIndexXslt(), targetDoc, tree, paramsMap);
    targetDocNode = new TargetDocumentNodeData(targetDoc, tree);

    const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
    const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
    expect(shipOrderChildren.length).toEqual(6);
    expect(shipOrderChildren[0].title).toEqual('OrderId');
    expect(shipOrderChildren[1].title).toEqual('OrderPerson');
    expect(shipOrderChildren[2].title).toEqual('ShipTo');
    expect(shipOrderChildren[3].title).toEqual('Item');
    expect(VisualizationUtilService.isCollectionField(shipOrderChildren[3])).toBeTruthy();
    expect(shipOrderChildren[4].title).toEqual('Item');
    expect(VisualizationUtilService.isCollectionField(shipOrderChildren[4])).toBeTruthy();
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

  describe('with nested conditional mappings', () => {
    beforeEach(() => {
      MappingSerializerService.deserialize(getNestedConditionalsToShipOrderXslt(), targetDoc, tree, paramsMap);
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

  describe('formatXml()', () => {
    it('should return formatted XML with indentation', () => {
      const element = document.createElementNS('http://www.w3.org/1999/XSL/Transform', 'apply-templates');
      element.setAttribute('select', '/ns0:ShipOrder/Item');
      const child = document.createElementNS('http://www.w3.org/1999/XSL/Transform', 'sort');
      child.setAttribute('select', 'Title');
      element.appendChild(child);

      const result = VisualizationService.formatXml(element);

      expect(result).toContain('apply-templates');
      expect(result).toContain('sort');
      expect(result).toContain('\n');
    });

    it('should return the raw XML string when the element has no children', () => {
      const element = document.createElementNS('http://www.w3.org/1999/XSL/Transform', 'apply-templates');
      element.setAttribute('select', '/ns0:ShipOrder/Item');

      const result = VisualizationService.formatXml(element);

      expect(result).toContain('apply-templates');
      expect(result).toContain('/ns0:ShipOrder/Item');
    });
  });

  describe('VariableItem support', () => {
    it('should create VariableNodeData for VariableItem in MappingNodeData children', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      const fieldItem = new FieldItem(tree, targetDoc.fields[0]);
      tree.children.push(fieldItem);
      const variableItem = new VariableItem(fieldItem, 'taxRate');
      fieldItem.children.push(variableItem);
      const targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const fieldItemNodeData = new FieldItemNodeData(targetDocNode, fieldItem);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(fieldItemNodeData);
      const variableNodeData = children.find((c) => c instanceof VariableNodeData);
      expect(variableNodeData).toBeInstanceOf(VariableNodeData);
      expect(variableNodeData!.title).toBe('taxRate');
    });
  });
});
