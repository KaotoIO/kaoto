import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import {
  ChooseItem,
  CopyOfSelector,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingTree,
  ValueOfSelector,
  ValueOfType,
  ValueSelector,
  VariableItem,
} from '../../models/datamapper/mapping';
import {
  AddMappingNodeData,
  ChoiceFieldNodeData,
  CopyOfFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  NameValidationStatus,
  TargetDocumentNodeData,
  TargetRenderIndex,
  VariableNodeData,
} from '../../models/datamapper/visualization';
import {
  createTargetTree,
  findField,
  NS_POC,
  parseXsdDocument,
  rowsOf,
} from '../../stubs/datamapper/cardinality-test-helpers';
import {
  getAnnotatedFieldsXsd,
  getAttributesAroundWrappersXsd,
  getExtensionComplexXsd,
  getExtensionSimpleXsd,
  getNestedConditionalsToShipOrderXslt,
  getSchemaTestXsd,
  getShipOrderAttributeCopyOfXslt,
  getShipOrderToShipOrderCollectionIndexXslt,
  getShipOrderToShipOrderMultipleForEachXslt,
  getShipOrderToShipOrderXslt,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { expectLinksOnRenderedRows } from '../../stubs/datamapper/target-render-test-helpers';
import {
  appendCopyOf,
  appendFieldItem,
  appendIf,
  findRow,
  rowLabels,
} from '../../stubs/datamapper/target-row-test-helpers';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { MappingLinksService } from './mapping-links.service';
import { TargetRenderService } from './target-render.service';
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
        const primitiveSpy = vi.spyOn(VisualizationService, 'generatePrimitiveDocumentChildren');
        const structuredSpy = vi.spyOn(VisualizationService, 'generateStructuredDocumentChildren');
        const nonDocumentSpy = vi.spyOn(VisualizationService, 'generateNonDocumentNodeDataChildren');
        sourceDocNode.isPrimitive = true;
        VisualizationService.generateNodeDataChildren(sourceDocNode);

        expect(primitiveSpy).toHaveBeenCalled();
        expect(structuredSpy).not.toHaveBeenCalled();
        expect(nonDocumentSpy).not.toHaveBeenCalled();
      });

      it('should generate structured document children', () => {
        const primitiveSpy = vi.spyOn(VisualizationService, 'generatePrimitiveDocumentChildren');
        const structuredSpy = vi.spyOn(VisualizationService, 'generateStructuredDocumentChildren');
        const nonDocumentSpy = vi.spyOn(VisualizationService, 'generateNonDocumentNodeDataChildren');
        sourceDocNode.isPrimitive = false;
        VisualizationService.generateNodeDataChildren(sourceDocNode);

        expect(primitiveSpy).not.toHaveBeenCalled();
        expect(structuredSpy).toHaveBeenCalled();
        expect(nonDocumentSpy).not.toHaveBeenCalled();
      });

      it('should generate non document children', () => {
        const primitiveSpy = vi.spyOn(VisualizationService, 'generatePrimitiveDocumentChildren');
        const structuredSpy = vi.spyOn(VisualizationService, 'generateStructuredDocumentChildren');
        const nonDocumentSpy = vi.spyOn(VisualizationService, 'generateNonDocumentNodeDataChildren');

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
      expect(docChildren).toHaveLength(1);

      const product = docChildren[0];
      expect(product.title).toBe('Product');
      const productChildren = VisualizationService.generateNonDocumentNodeDataChildren(product);
      expect(productChildren).toHaveLength(2);

      const nameField = productChildren.find((child) => child.title === 'name') as FieldNodeData;
      expect(nameField).toBeDefined();
      const nameChildren = VisualizationService.generateNonDocumentNodeDataChildren(nameField);

      expect(nameChildren).toHaveLength(2);
      const langAttr = nameChildren.find((child) => child.title === 'lang');
      expect(langAttr).toBeDefined();
      const formatAttr = nameChildren.find((child) => child.title === 'format');
      expect(formatAttr).toBeDefined();

      const priceField = productChildren.find((child) => child.title === 'price') as FieldNodeData;
      expect(priceField).toBeDefined();
      const priceChildren = VisualizationService.generateNonDocumentNodeDataChildren(priceField);

      expect(priceChildren).toHaveLength(3);
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
      expect(docChildren).toHaveLength(1);

      const request = docChildren[0];
      expect(request.title).toBe('Request');
      const requestChildren = VisualizationService.generateNonDocumentNodeDataChildren(request);

      expect(requestChildren).toHaveLength(3);

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
      expect(docChildren).toHaveLength(1);

      const root = docChildren[0];
      expect(root.title).toBe('Root');
      const rootChildren = VisualizationService.generateNonDocumentNodeDataChildren(root);
      expect(rootChildren).toHaveLength(2);

      const personField = rootChildren.find((child) => child.title === 'person') as FieldNodeData;
      expect(personField).toBeDefined();
      const personChildren = VisualizationService.generateNonDocumentNodeDataChildren(personField);

      // name, street, city, choice wrapper, createdBy, createdDate, @id, @version, @status
      expect(personChildren).toHaveLength(9);

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
    expect(shipOrderChildren).toHaveLength(6);
    expect(shipOrderChildren[0].title).toBe('OrderId');
    expect(shipOrderChildren[1].title).toBe('OrderPerson');
    expect(shipOrderChildren[2].title).toBe('ShipTo');
    expect(shipOrderChildren[3].title).toBe('for-each');
    expect(shipOrderChildren[4].title).toBe('for-each');
    expect(shipOrderChildren[5].title).toBe('Item');

    const forEach1Node = shipOrderChildren[3] as MappingNodeData;
    expect((forEach1Node.mapping as ForEachItem).expression).toBe('/ns0:ShipOrder/Item');
    const forEach1Children = VisualizationService.generateNonDocumentNodeDataChildren(forEach1Node);
    expect(forEach1Children).toHaveLength(1);
    expect(forEach1Children[0].title).toBe('Item');
    expect(VisualizationUtilService.isCollectionField(forEach1Children[0])).toBeTruthy();
    const forEach1ItemChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEach1Children[0]);
    expect(forEach1ItemChildren).toHaveLength(4);
    expect(forEach1ItemChildren[0].title).toBe('Title');
    const title1Selector = (forEach1ItemChildren[0] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(title1Selector.expression).toBe('Title');

    const forEach2Node = shipOrderChildren[4] as MappingNodeData;
    expect((forEach2Node.mapping as ForEachItem).expression).toBe('$sourceParam1/ns0:ShipOrder/Item');
    const forEach2Children = VisualizationService.generateNonDocumentNodeDataChildren(forEach2Node);
    expect(forEach2Children).toHaveLength(1);
    expect(forEach2Children[0].title).toBe('Item');
    expect(VisualizationUtilService.isCollectionField(forEach2Children[0])).toBeTruthy();
    const forEach2ItemChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEach2Children[0]);
    expect(forEach2ItemChildren).toHaveLength(4);
    expect(forEach2ItemChildren[0].title).toBe('Title');
    const title2Selector = (forEach2ItemChildren[0] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(title2Selector.expression).toBe('Title');

    expect(shipOrderChildren[5] instanceof AddMappingNodeData).toBeTruthy();
    const addMappingNode = shipOrderChildren[5] as AddMappingNodeData;
    expect(addMappingNode.title).toBe('Item');
    expect(addMappingNode.id).toContain('add-mapping-fx-Item');
    expect(addMappingNode.field.name).toBe('Item');
    expect(addMappingNode.field.maxOccurs).toBe('unbounded');
  });

  it('should generate for multiple indexed collection mappings on a same collection target field', () => {
    vi.spyOn(globalThis, 'crypto', 'get').mockImplementation(
      () => ({ getRandomValues: () => [Math.random() * 10000] }) as unknown as Crypto,
    );

    MappingSerializerService.deserialize(getShipOrderToShipOrderCollectionIndexXslt(), targetDoc, tree, paramsMap);
    targetDocNode = new TargetDocumentNodeData(targetDoc, tree);

    const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
    const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
    expect(shipOrderChildren).toHaveLength(6);
    expect(shipOrderChildren[0].title).toBe('OrderId');
    expect(shipOrderChildren[1].title).toBe('OrderPerson');
    expect(shipOrderChildren[2].title).toBe('ShipTo');
    expect(shipOrderChildren[3].title).toBe('Item');
    expect(VisualizationUtilService.isCollectionField(shipOrderChildren[3])).toBeTruthy();
    expect(shipOrderChildren[4].title).toBe('Item');
    expect(VisualizationUtilService.isCollectionField(shipOrderChildren[4])).toBeTruthy();
    expect(shipOrderChildren[3].id).not.toEqual(shipOrderChildren[4].id);
    expect(shipOrderChildren[5].title).toBe('Item');

    const item1Children = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[3]);
    expect(item1Children).toHaveLength(4);
    expect(item1Children[0].title).toBe('Title');
    const title1Selector = (item1Children[0] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(title1Selector.expression).toBe('/ns0:ShipOrder/Item[0]/Title');

    const item2Children = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[4]);
    expect(item2Children).toHaveLength(4);
    expect(item2Children[0].title).toBe('Title');
    const title2Selector = (item2Children[0] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(title2Selector.expression).toBe('/ns0:ShipOrder/Item[1]/Title');

    expect(shipOrderChildren[5] instanceof AddMappingNodeData).toBeTruthy();
    const addMappingNode = shipOrderChildren[5] as AddMappingNodeData;
    expect(addMappingNode.title).toBe('Item');
    expect(addMappingNode.id).toContain('add-mapping-fx-Item');
    expect(addMappingNode.field.name).toBe('Item');
    expect(addMappingNode.field.maxOccurs).toBe('unbounded');
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
      expect(outerIfChildren).toHaveLength(1);

      const innerIfNode = outerIfChildren[0] as MappingNodeData;
      expect(innerIfNode.title).toBe('if');
      expect(innerIfNode.mapping).toBeInstanceOf(IfItem);

      const innerIfChildren = VisualizationService.generateNonDocumentNodeDataChildren(innerIfNode);
      expect(innerIfChildren).toHaveLength(1);
      expect(innerIfChildren[0].title).toBe('OrderPerson');
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
      expect(ifChildren).toHaveLength(1);

      const chooseNode = ifChildren[0] as MappingNodeData;
      expect(chooseNode.title).toBe('choose');
      expect(chooseNode.mapping).toBeInstanceOf(ChooseItem);

      const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseNode);
      expect(chooseChildren).toHaveLength(2);
      expect(chooseChildren[0].title).toBe('when');
      expect(chooseChildren[1].title).toBe('otherwise');
    });

    it('should generate if inside for-each', () => {
      const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

      const ifNodes = shipOrderChildren.filter((child) => child.title === 'if');
      const itemIfNode = ifNodes[2] as MappingNodeData;
      expect(itemIfNode).toBeDefined();
      expect(itemIfNode.mapping).toBeInstanceOf(IfItem);

      const ifChildren = VisualizationService.generateNonDocumentNodeDataChildren(itemIfNode);
      expect(ifChildren).toHaveLength(1);

      const forEachNode = ifChildren[0] as MappingNodeData;
      expect(forEachNode.title).toBe('for-each');
      expect(forEachNode.mapping).toBeInstanceOf(ForEachItem);

      const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachNode);
      expect(forEachChildren).toHaveLength(1);
      expect(forEachChildren[0].title).toBe('Item');

      const itemChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachChildren[0]);
      expect(itemChildren).toHaveLength(4);
      expect(itemChildren[0].title).toBe('Title');

      const noteIfNode = itemChildren[1] as MappingNodeData;
      expect(noteIfNode.title).toBe('if');
      expect(noteIfNode.mapping).toBeInstanceOf(IfItem);

      const noteIfChildren = VisualizationService.generateNonDocumentNodeDataChildren(noteIfNode);
      expect(noteIfChildren).toHaveLength(1);
      expect(noteIfChildren[0].title).toBe('Note');

      expect(itemChildren[2].title).toBe('Quantity');
      expect(itemChildren[3].title).toBe('Price');
    });
  });

  describe('optional guard see-through rendering', () => {
    let itemFieldItem: FieldItem;

    beforeEach(() => {
      tree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };
      const shipOrderItem = new FieldItem(tree, targetDoc.fields[0]);
      tree.children.push(shipOrderItem);
      const forEachItem = new ForEachItem(shipOrderItem);
      forEachItem.expression = '/ns0:ShipOrder/Item';
      shipOrderItem.children.push(forEachItem);
      itemFieldItem = new FieldItem(forEachItem, childField(targetDoc.fields[0], 'Item'));
      forEachItem.children.push(itemFieldItem);
    });

    function childField(parent: IField, name: string): IField {
      return parent.fields.find((field) => field.name === name)!;
    }

    function addGuardedNote(test: string, expression: string) {
      const ifItem = new IfItem(itemFieldItem);
      ifItem.expression = test;
      itemFieldItem.children.push(ifItem);
      const fieldItem = new FieldItem(ifItem, childField(itemFieldItem.field, 'Note'));
      ifItem.children.push(fieldItem);
      const selector = new ValueOfSelector(fieldItem);
      selector.expression = expression;
      fieldItem.children.push(selector);
      return { ifItem, fieldItem };
    }

    function buildRenderIndex() {
      return TargetRenderService.buildIndex(tree, { sourceParameterMap: paramsMap, sourceBody: sourceDoc });
    }

    function generateItemChildren(renderIndex: TargetRenderIndex) {
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree, renderIndex);
      const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
      const forEachNode = shipOrderChildren.find(
        (c) => c instanceof MappingNodeData && c.mapping instanceof ForEachItem,
      ) as MappingNodeData;
      const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachNode);
      return VisualizationService.generateNonDocumentNodeDataChildren(forEachChildren[0]);
    }

    it('should render a guard absorbed by the render index as its field row, without an if row', () => {
      const { ifItem, fieldItem } = addGuardedNote('Note', 'Note');
      const renderIndex = buildRenderIndex();

      const itemChildren = generateItemChildren(renderIndex);

      expect(renderIndex.isAbsorbed(ifItem)).toBe(true);
      expect(itemChildren.some((c) => c.title === 'if')).toBe(false);
      const noteNode = itemChildren.find((c) => c.title === 'Note') as FieldItemNodeData;
      expect(noteNode).toBeInstanceOf(FieldItemNodeData);
      expect(noteNode.mapping).toBe(fieldItem);
      expect(noteNode.autoOptionalIfItem).toBe(ifItem);
      expectLinksOnRenderedRows(
        MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc, renderIndex),
        targetDocNode,
      );
    });

    it('should render a guard whose source is required as a visible if row', () => {
      const { ifItem, fieldItem } = addGuardedNote('Title', 'Title');
      const renderIndex = buildRenderIndex();

      const itemChildren = generateItemChildren(renderIndex);

      expect(renderIndex.isAbsorbed(ifItem)).toBe(false);
      expect(itemChildren.some((c) => c.title === 'Note')).toBe(false);
      const ifNode = itemChildren.find((c) => c.title === 'if') as MappingNodeData;
      expect(ifNode.mapping).toBe(ifItem);
      const ifChildren = VisualizationService.generateNonDocumentNodeDataChildren(ifNode);
      expect(ifChildren).toHaveLength(1);
      const noteNode = ifChildren[0] as FieldItemNodeData;
      expect(noteNode.mapping).toBe(fieldItem);
      expect(noteNode.autoOptionalIfItem).toBeUndefined();
      expectLinksOnRenderedRows(
        MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc, renderIndex),
        targetDocNode,
      );
    });

    it('should render a guard as a visible if row when the render index does not absorb it', () => {
      const { ifItem } = addGuardedNote('Note', 'Note');

      const itemChildren = generateItemChildren(TargetRenderIndex.EMPTY);

      const ifNode = itemChildren.find((c) => c.title === 'if') as MappingNodeData;
      expect(ifNode.mapping).toBe(ifItem);
      expect(itemChildren.some((c) => c.title === 'Note')).toBe(false);
    });

    it('should render the guard as a visible if row once a sibling is added under it', () => {
      const { ifItem, fieldItem } = addGuardedNote('Note', 'Note');
      ifItem.children.push(new VariableItem(ifItem, 'myVar'));
      const renderIndex = buildRenderIndex();

      const itemChildren = generateItemChildren(renderIndex);

      expect(renderIndex.isAbsorbed(ifItem)).toBe(false);
      const ifNode = itemChildren.find((c) => c.title === 'if') as MappingNodeData;
      expect(ifNode.mapping).toBe(ifItem);
      expect(itemChildren.some((c) => c.title === 'Note')).toBe(false);
      expect(fieldItem.parent).toBe(ifItem);
    });

    it('should render the guard as a visible if row once its field is wrapped by another instruction', () => {
      const { ifItem, fieldItem } = addGuardedNote('Note', 'Note');
      const chooseItem = new ChooseItem(ifItem);
      ifItem.children = [chooseItem];
      fieldItem.parent = chooseItem;
      chooseItem.children.push(fieldItem);
      const renderIndex = buildRenderIndex();

      const itemChildren = generateItemChildren(renderIndex);

      expect(renderIndex.isAbsorbed(ifItem)).toBe(false);
      const ifNode = itemChildren.find((c) => c.title === 'if') as MappingNodeData;
      expect(ifNode.mapping).toBe(ifItem);
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

  describe('standalone CopyOfSelector support', () => {
    it('should render a copy-of container node as the first child, ahead of regular fields', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      const fieldItem = new FieldItem(tree, targetDoc.fields[0]);
      tree.children.push(fieldItem);
      expect(fieldItem.field.fields.length).toBeGreaterThan(0);
      const copyOfSelector = new CopyOfSelector(fieldItem);
      fieldItem.children.push(copyOfSelector);
      const targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const fieldItemNodeData = new FieldItemNodeData(targetDocNode, fieldItem);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(fieldItemNodeData);
      expect(children.length).toBeGreaterThan(1);
      expect('mapping' in children[0] && (children[0] as MappingNodeData).mapping).toBe(copyOfSelector);
    });
  });

  describe('validateVariableName()', () => {
    it('should accept a valid name', () => {
      const result = VisualizationService.validateVariableName('taxRate', tree);
      expect(result.status).toEqual(NameValidationStatus.SUCCESS);
      expect(result.error).toBeUndefined();
    });

    it.each(['_private', 'tax-rate', 'v1.0', 'x'])('should accept name "%s"', (name) => {
      const result = VisualizationService.validateVariableName(name, tree);
      expect(result.status).toEqual(NameValidationStatus.SUCCESS);
    });

    it('should return EMPTY for empty name', () => {
      const result = VisualizationService.validateVariableName('', tree);
      expect(result.status).toEqual(NameValidationStatus.EMPTY);
      expect(result.error).toBeUndefined();
    });

    it('should return EMPTY for whitespace-only name', () => {
      const result = VisualizationService.validateVariableName('   ', tree);
      expect(result.status).toEqual(NameValidationStatus.EMPTY);
    });

    it.each([
      ['1var', 'starting with digit'],
      ['-var', 'starting with hyphen'],
      ['tax rate', 'with spaces'],
      ['var@name', 'with special characters'],
    ])('should reject name %s ("%s")', (name) => {
      const result = VisualizationService.validateVariableName(name, tree);
      expect(result.status).toEqual(NameValidationStatus.ERROR);
      expect(result.error).toContain('valid NCName');
    });

    it.each([
      ['myVar-x', "'-x'", 'name ending with -x'],
      ['mapped-xml', "'mapped-xml'", 'reserved name mapped-xml'],
      ['ns:var', 'valid NCName', 'name with colon (QName but not NCName)'],
      ['1bad-x', 'valid NCName', 'first error only (early return)'],
    ])('should reject %s', (name, expectedError) => {
      const result = VisualizationService.validateVariableName(name, tree);
      expect(result.status).toEqual(NameValidationStatus.ERROR);
      expect(result.error).toContain(expectedError);
    });

    it('should reject duplicate name within scope', () => {
      const variable = new VariableItem(tree, 'existingVar');
      tree.children.push(variable);
      const result = VisualizationService.validateVariableName('existingVar', tree);
      expect(result.status).toEqual(NameValidationStatus.ERROR);
      expect(result.error).toContain("'existingVar' already exists");
    });

    it('should reject duplicate name in globalVariables', () => {
      const variable = new VariableItem(tree, 'gVar');
      variable.scope = 'template';
      tree.globalVariables.push(variable);
      const result = VisualizationService.validateVariableName('gVar', tree);
      expect(result.status).toEqual(NameValidationStatus.ERROR);
      expect(result.error).toContain("'gVar' already exists");
    });
  });

  describe('validateParameterName()', () => {
    it('should accept a valid name', () => {
      const result = VisualizationService.validateParameterName('myParam', new Map());
      expect(result.status).toEqual(NameValidationStatus.SUCCESS);
      expect(result.error).toBeUndefined();
    });

    it('should return EMPTY for empty name', () => {
      const result = VisualizationService.validateParameterName('', new Map());
      expect(result.status).toEqual(NameValidationStatus.EMPTY);
      expect(result.error).toBeUndefined();
    });

    it('should reject duplicate parameter name', () => {
      const paramMap = new Map<string, IDocument>([['existingParam', {} as IDocument]]);
      const result = VisualizationService.validateParameterName('existingParam', paramMap);
      expect(result.status).toEqual(NameValidationStatus.ERROR);
      expect(result.error).toContain("'existingParam' already exists");
    });

    it('should reject invalid QName', () => {
      const result = VisualizationService.validateParameterName('123invalid', new Map());
      expect(result.status).toEqual(NameValidationStatus.ERROR);
      expect(result.error).toContain('valid QName');
    });

    it('should reject name with spaces', () => {
      const result = VisualizationService.validateParameterName('my param', new Map());
      expect(result.status).toEqual(NameValidationStatus.ERROR);
      expect(result.error).toContain('valid QName');
    });
  });

  describe('isInlineValueSelector()', () => {
    it('should return true for VALUE ValueOfSelector on a leaf field', () => {
      // targetDoc.fields[0] is ShipOrder (container). Its first child field is a leaf (no children).
      const shipOrderFI = new FieldItem(tree, targetDoc.fields[0]);
      const leafField = targetDoc.fields[0].fields[0]; // e.g. OrderId — a leaf field
      const leafFI = new FieldItem(shipOrderFI, leafField);
      const vs = new ValueOfSelector(leafFI, ValueOfType.VALUE);
      expect(VisualizationUtilService.isInlineValueSelector(vs)).toBe(true);
    });

    it('should return false for VALUE ValueOfSelector on an expandable field (has children)', () => {
      // ShipOrder has child fields, so value-of on it renders as an explicit tree node
      const shipOrderFI = new FieldItem(tree, targetDoc.fields[0]);
      const vs = new ValueOfSelector(shipOrderFI, ValueOfType.VALUE);
      expect(VisualizationUtilService.isInlineValueSelector(vs)).toBe(false);
    });

    it('should return true for ATTRIBUTE ValueOfSelector', () => {
      const fieldItem = new FieldItem(tree, targetDoc.fields[0]);
      const vs = new ValueOfSelector(fieldItem, ValueOfType.ATTRIBUTE);
      expect(VisualizationUtilService.isInlineValueSelector(vs)).toBe(true);
    });

    it('should return false for any CopyOfSelector, which is a row of its own or a field row, never an input of its parent', () => {
      const fieldItem = new FieldItem(tree, targetDoc.fields[0]);
      const vs = new CopyOfSelector(fieldItem);
      expect(VisualizationUtilService.isInlineValueSelector(vs)).toBe(false);
    });

    it('should return false for non-ValueSelector MappingItem', () => {
      const fieldItem = new FieldItem(tree, targetDoc.fields[0]);
      expect(VisualizationUtilService.isInlineValueSelector(fieldItem)).toBe(false);
    });
  });

  describe('copy-of tree-node rendering', () => {
    it('should show a standalone copy-of as tree node in hasChildren', () => {
      const fieldItem = new FieldItem(tree, targetDoc.fields[0]);
      tree.children.push(fieldItem);
      const vs = new CopyOfSelector(fieldItem);
      fieldItem.children.push(vs);
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      expect(VisualizationService.hasChildren(docChildren[0])).toBe(true);
    });

    it('should not show inline VALUE ValueOfSelector as tree node child', () => {
      const shipOrderFI = new FieldItem(tree, targetDoc.fields[0]);
      tree.children.push(shipOrderFI);
      const orderPersonField = targetDoc.fields[0].fields[0];
      const orderPersonFI = new FieldItem(shipOrderFI, orderPersonField);
      shipOrderFI.children.push(orderPersonFI);
      const vs = new ValueOfSelector(orderPersonFI, ValueOfType.VALUE);
      orderPersonFI.children.push(vs);
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
      const orderPersonNode = shipOrderChildren.find((c) => c.title === orderPersonField.name) as FieldItemNodeData;
      expect(VisualizationService.hasChildren(orderPersonNode)).toBe(false);
    });

    it('should show a standalone copy-of as tree node in primitive document children', () => {
      const primitiveTargetDoc = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const primitiveTree = new MappingTree(
        primitiveTargetDoc.documentType,
        primitiveTargetDoc.documentId,
        DocumentDefinitionType.Primitive,
      );
      const vs = new CopyOfSelector(primitiveTree);
      primitiveTree.children.push(vs);
      const primitiveDocNode = new TargetDocumentNodeData(primitiveTargetDoc, primitiveTree);
      const children = VisualizationService.generatePrimitiveDocumentChildren(primitiveDocNode);
      const copyOfNode = children.find((c) => c instanceof MappingNodeData && c.mapping instanceof ValueSelector);
      expect(copyOfNode).toBeDefined();
    });
  });

  describe('attribute groups on the target', () => {
    const ATTRS_NS = 'io.kaoto.datamapper.test.attributes';

    const renderChildren = (docNode: DocumentNodeData) =>
      rowsOf(VisualizationService.generateStructuredDocumentChildren(docNode)[0]);

    const shipOrder = () => {
      const shipTree = createTargetTree(targetDoc, { ns0: NS_POC });
      const root = findField(targetDoc, 'ShipOrder');
      const rootItem = appendFieldItem(shipTree, root);
      return {
        root,
        rootItem,
        field: (name: string) => findField(root, name),
        render: () => renderChildren(new TargetDocumentNodeData(targetDoc, shipTree)),
      };
    };

    const customer = () => {
      const doc = parseXsdDocument(DocumentType.TARGET_BODY, 'annotated.xsd', getAnnotatedFieldsXsd(), {
        namespaceUri: 'http://www.example.com/annotated',
        name: 'Customer',
      });
      const customerTree = createTargetTree(doc, {});
      const root = findField(doc, 'Customer');
      const rootItem = appendFieldItem(customerTree, root);
      return {
        rootItem,
        field: (name: string) => findField(root, name),
        render: () => renderChildren(new TargetDocumentNodeData(doc, customerTree)),
      };
    };

    const holderDoc = (type: DocumentType) =>
      parseXsdDocument(type, 'AttributesAroundWrappers.xsd', getAttributesAroundWrappersXsd());

    it('should draw an imported attribute copy-of right below the attribute rows', () => {
      const importTree = new MappingTree(
        targetDoc.documentType,
        targetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      MappingSerializerService.deserialize(getShipOrderAttributeCopyOfXslt(), targetDoc, importTree, paramsMap);

      expect(rowLabels(renderChildren(new TargetDocumentNodeData(targetDoc, importTree)))).toEqual([
        'OrderId',
        'copy(/ns0:ShipOrder/@*)',
        'OrderPerson',
        'ShipTo',
        'Item',
      ]);
    });

    it('should draw a copy-of of a single attribute below the attribute rows', () => {
      const s = shipOrder();
      appendCopyOf(s.rootItem, '/ns0:ShipOrder/@OrderId');

      expect(rowLabels(s.render())).toEqual([
        'OrderId',
        'copy(/ns0:ShipOrder/@OrderId)',
        'OrderPerson',
        'ShipTo',
        'Item',
      ]);
    });

    it('should draw an attribute copy above an attribute authored after it, which overrides the copy', () => {
      const s = shipOrder();
      appendCopyOf(s.rootItem, '/ns0:ShipOrder/@*');
      appendFieldItem(s.rootItem, s.field('OrderId'));
      appendFieldItem(s.rootItem, s.field('OrderPerson'));

      expect(rowLabels(s.render())).toEqual(['copy(/ns0:ShipOrder/@*)', 'OrderId', 'OrderPerson', 'ShipTo', 'Item']);
    });

    it('should draw an attribute copy below an attribute authored before it, which the copy overrides', () => {
      const s = shipOrder();
      appendFieldItem(s.rootItem, s.field('OrderId'));
      appendCopyOf(s.rootItem, '/ns0:ShipOrder/@*');
      appendFieldItem(s.rootItem, s.field('OrderPerson'));

      expect(rowLabels(s.render())).toEqual(['OrderId', 'copy(/ns0:ShipOrder/@*)', 'OrderPerson', 'ShipTo', 'Item']);
    });

    it('should keep attribute rows in schema order when mapped attributes are authored out of it', () => {
      const c = customer();
      appendFieldItem(c.rootItem, c.field('status'));
      appendCopyOf(c.rootItem, '/Customer/@*');
      appendFieldItem(c.rootItem, c.field('id'));

      expect(rowLabels(c.render())).toEqual([
        'copy(/Customer/@*)',
        'id',
        'status',
        'noAnnotationAttr',
        'name',
        'email',
        'age',
        'address',
        'noAnnotation',
      ]);
    });

    it('should not let an attribute held only by an item that writes both pull an attribute copy above it', () => {
      const c = customer();
      appendFieldItem(c.rootItem, c.field('status'));
      appendCopyOf(c.rootItem, '/Customer/@*');
      const ifItem = appendIf(c.rootItem);
      appendFieldItem(ifItem, c.field('id'));
      appendFieldItem(ifItem, c.field('name'));

      expect(rowLabels(c.render())).toEqual([
        'status',
        'noAnnotationAttr',
        'copy(/Customer/@*)',
        'if',
        'email',
        'age',
        'address',
        'noAnnotation',
      ]);
    });

    it('should draw an attribute authored after an instruction that writes both before that instruction', () => {
      const c = customer();
      const ifItem = appendIf(c.rootItem);
      appendFieldItem(ifItem, c.field('id'));
      appendFieldItem(ifItem, c.field('name'));
      appendFieldItem(c.rootItem, c.field('status'));

      expect(rowLabels(c.render())).toEqual([
        'status',
        'noAnnotationAttr',
        'if',
        'email',
        'age',
        'address',
        'noAnnotation',
      ]);
    });

    it('should draw an instruction that writes both after the attribute rows, with no row for its element', () => {
      const s = shipOrder();
      const ifItem = appendIf(s.rootItem);
      appendCopyOf(ifItem, '/ns0:ShipOrder/@*');
      appendFieldItem(ifItem, s.field('ShipTo'));

      expect(rowLabels(s.render())).toEqual(['OrderId', 'if', 'OrderPerson', 'Item']);
    });

    it('should keep the Add row of a collection held only by an instruction that writes both at its position', () => {
      const s = shipOrder();
      const ifItem = appendIf(s.rootItem);
      appendCopyOf(ifItem, '/ns0:ShipOrder/@*');
      appendFieldItem(ifItem, s.field('Item'));

      expect(rowLabels(s.render())).toEqual(['OrderId', 'if', 'OrderPerson', 'ShipTo', '+Item']);
    });

    it('should draw a copy-of of attributes and an element before the element rows, not in front of that element', () => {
      const s = shipOrder();
      appendCopyOf(s.rootItem, '/ns0:ShipOrder/@* | /ns0:ShipOrder/ShipTo');

      expect(rowLabels(s.render())).toEqual([
        'OrderId',
        'copy(/ns0:ShipOrder/@* | /ns0:ShipOrder/ShipTo)',
        'OrderPerson',
        'ShipTo',
        'Item',
      ]);
    });

    it('should draw items that write both in authored order, after every item that writes only attributes', () => {
      const s = shipOrder();
      const itemIf = appendIf(s.rootItem);
      appendCopyOf(itemIf, '/ns0:ShipOrder/@*');
      appendFieldItem(itemIf, s.field('Item'));
      const shipToIf = appendIf(s.rootItem);
      appendCopyOf(shipToIf, '/ns0:ShipOrder/@*');
      appendFieldItem(shipToIf, s.field('ShipTo'));
      appendCopyOf(s.rootItem, '/ns0:ShipOrder/@*');

      const rows = s.render();

      expect(rowLabels(rows)).toEqual(['OrderId', 'copy(/ns0:ShipOrder/@*)', 'if', 'if', 'OrderPerson', '+Item']);
      expect((rows[2] as MappingNodeData).mapping).toBe(itemIf);
      expect((rows[3] as MappingNodeData).mapping).toBe(shipToIf);
    });

    it('should draw field-less instructions by what they write', () => {
      const s = shipOrder();
      const ifItem = appendIf(s.rootItem);
      appendCopyOf(ifItem, '/ns0:ShipOrder/@* | /ns0:ShipOrder/node()');
      const loop = new ForEachItem(s.rootItem);
      loop.expression = '/ns0:ShipOrder/@*';
      s.rootItem.children.push(loop);
      appendCopyOf(loop, '.');

      expect(rowLabels(s.render())).toEqual(['OrderId', 'for-each', 'if', 'OrderPerson', 'ShipTo', 'Item']);
    });

    it('should draw an attribute copy of a simple-content element right after its attribute rows', () => {
      const doc = TestUtil.createExtensionSimpleDoc();
      const simpleTree = createTargetTree(doc, { ns0: 'http://www.example.com/SIMPLE' });
      const product = findField(doc, 'Product');
      const productItem = appendFieldItem(simpleTree, product);
      const nameItem = appendFieldItem(productItem, findField(product, 'name'));
      const value = new ValueOfSelector(nameItem, ValueOfType.VALUE);
      value.expression = '/ns0:Product/ns0:name';
      nameItem.children.push(value);
      appendCopyOf(nameItem, '/ns0:Product/ns0:name/@*');
      const nameNode = findRow(renderChildren(new TargetDocumentNodeData(doc, simpleTree)), 'name');

      const labels = rowLabels(VisualizationService.generateNonDocumentNodeDataChildren(nameNode));

      expect(labels.slice(0, 3)).toEqual(['lang', 'format', 'copy(/ns0:Product/ns0:name/@*)']);
    });

    describe('xsi:nil on a nillable element with an inline complex type', () => {
      const nillableRows = (type: DocumentType, mapLeaf: boolean) => {
        const doc = holderDoc(type);
        const holder = findField(doc, 'Holder');
        const nillable = findField(holder, 'NillableInline');
        let docNode: DocumentNodeData;
        if (type === DocumentType.TARGET_BODY) {
          const holderTree = createTargetTree(doc, { ns0: ATTRS_NS });
          if (mapLeaf) {
            const holderItem = appendFieldItem(holderTree, holder);
            const nillableItem = appendFieldItem(holderItem, nillable);
            appendFieldItem(nillableItem, findField(nillable, 'Leaf'));
          }
          docNode = new TargetDocumentNodeData(doc, holderTree);
        } else {
          docNode = new DocumentNodeData(doc);
        }
        const nillableNode = findRow(renderChildren(docNode), 'NillableInline');
        return rowLabels(VisualizationService.generateNonDocumentNodeDataChildren(nillableNode));
      };

      it('should draw xsi:nil among the attribute rows of an unmapped target element', () => {
        expect(nillableRows(DocumentType.TARGET_BODY, false)).toEqual(['code', 'xsi:nil', 'Leaf']);
      });

      it('should draw xsi:nil among the attribute rows of a mapped target element', () => {
        expect(nillableRows(DocumentType.TARGET_BODY, true)).toEqual(['code', 'xsi:nil', 'Leaf']);
      });

      it('should keep schema order on the source', () => {
        expect(nillableRows(DocumentType.SOURCE_BODY, false)).toEqual(['code', 'Leaf', 'xsi:nil']);
      });
    });

    it('should draw an imported attribute the schema does not declare among the attribute rows', () => {
      const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
  <xsl:template match="/">
    <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
      <OrderPerson><xsl:value-of select="/ns0:ShipOrder/ns0:OrderPerson"/></OrderPerson>
      <xsl:attribute name="extra"><xsl:value-of select="'x'"/></xsl:attribute>
    </ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;
      const importTree = new MappingTree(
        targetDoc.documentType,
        targetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      MappingSerializerService.deserialize(xslt, targetDoc, importTree, paramsMap);

      const labels = rowLabels(renderChildren(new TargetDocumentNodeData(targetDoc, importTree)));

      expect(labels.slice(0, 3)).toEqual(['OrderId', 'extra', 'OrderPerson']);
    });

    it('should draw an instruction that writes only attributes and maps an attribute once, on its row', () => {
      const s = shipOrder();
      const ifItem = appendIf(s.rootItem);
      appendFieldItem(ifItem, s.field('OrderId'));
      appendCopyOf(ifItem, '/ns0:ShipOrder/@*');

      expect(rowLabels(s.render())).toEqual(['if', 'OrderPerson', 'ShipTo', 'Item']);
    });

    it('should keep copy-ofs that write only children where they were', () => {
      const s = shipOrder();
      appendCopyOf(s.rootItem, "/ns0:ShipOrder/Item[@type = 'a']");
      appendCopyOf(s.rootItem, 'string(/ns0:ShipOrder/@OrderId)');

      const rows = s.render();

      expect(rowLabels(rows)).toEqual([
        'OrderId',
        'OrderPerson',
        'ShipTo',
        'Item',
        '+Item',
        'copy(string(/ns0:ShipOrder/@OrderId))',
      ]);
      expect(rows[3]).toBeInstanceOf(CopyOfFieldNodeData);
    });
  });
});
