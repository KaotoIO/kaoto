import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
} from '../../models/datamapper/document';
import { FieldItem, MappingTree, ValueSelector } from '../../models/datamapper/mapping';
import { useDocumentTreeStore } from '../../store';
import { mockRandomValues } from '../../stubs';
import {
  getContactsXsd,
  getFieldSubstitutionXsd,
  getInvoice850Xsd,
  getJsonBodyToShipOrderXslt,
  getMessage837Xsd,
  getOrgToContactsXslt,
  getOrgXsd,
  getSchemaTestXsd,
  getShipOrderJsonSchema,
  getShipOrderToShipOrderCollectionIndexXslt,
  getShipOrderToShipOrderMultipleForEachXslt,
  getShipOrderToShipOrderXslt,
  getShipOrderWithCurrentXslt,
  getX12837PDfdlXsd,
  getX12837PXslt,
  getX12850DfdlXsd,
  getX12850ForEachXslt,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { DocumentUtilService } from '../document/document-util.service';
import { JsonSchemaDocumentService } from '../document/json-schema/json-schema-document.service';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { XPathService } from '../xpath/xpath.service';
import { MappingLinksService } from './mapping-links.service';

describe('MappingLinksService', () => {
  let sourceDoc: XmlSchemaDocument;
  let targetDoc: XmlSchemaDocument;
  let paramsMap: Map<string, IDocument>;
  let tree: MappingTree;

  beforeAll(() => {
    mockRandomValues();
  });

  beforeEach(() => {
    sourceDoc = TestUtil.createSourceOrderDoc();
    targetDoc = TestUtil.createTargetOrderDoc();
    paramsMap = TestUtil.createParameterMap();
    tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
    MappingSerializerService.deserialize(getShipOrderToShipOrderXslt(), targetDoc, tree, paramsMap);
  });

  describe('extractMappingLinks()', () => {
    it('should return IMappingLink[]', () => {
      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.length).toEqual(11);
      expect(links[0].sourceNodePath).toMatch('OrderId');
      expect(links[0].targetNodePath).toMatch('OrderId');
      expect(links[1].sourceNodePath).toMatch('OrderPerson');
      expect(links[1].targetNodePath).toMatch('/if-');
      expect(links[2].sourceNodePath).toMatch('OrderPerson');
      expect(links[2].targetNodePath).toMatch(/if-.*fx-OrderPerson/);
      expect(links[3].targetNodePath).toMatch('ShipTo');
      expect(links[3].targetNodePath).toMatch('ShipTo');
      expect(links[4].sourceNodePath).toMatch('Item');
      expect(links[4].targetNodePath).toMatch('/for-each');
      expect(links[5].sourceNodePath).toMatch('Title');
      expect(links[5].targetNodePath).toMatch(/for-each-.*fx-Item-.*fx-Title-.*/);
      expect(links[6].sourceNodePath).toMatch('Note');
      expect(links[6].targetNodePath).toMatch(/for-each-.*fx-Item-.*choose-.*when-.*/);
      expect(links[7].sourceNodePath).toMatch('Note');
      expect(links[7].targetNodePath).toMatch(/for-each-.*fx-Item-.*fx-Note-.*/);
      expect(links[8].sourceNodePath).toMatch('Title');
      expect(links[8].targetNodePath).toMatch(/for-each-.*fx-Item-.*choose-.*otherwise-.*fx-Note-.*/);
      expect(links[9].sourceNodePath).toMatch('Quantity');
      expect(links[9].targetNodePath).toMatch(/for-each-.*fx-Item-.*fx-Quantity-.*/);
      expect(links[10].sourceNodePath).toMatch('Price');
      expect(links[10].targetNodePath).toMatch(/for-each-.*fx-Item-.*fx-Price-.*/);
    });

    it('should generate mapping links for the cached type fragments field', () => {
      const sourceDefinition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'x12837PDfdl.xsd': getX12837PDfdlXsd() },
      );
      sourceDoc = XmlSchemaDocumentService.createXmlSchemaDocument(sourceDefinition).document!;
      const targetDefinition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'message837.xsd': getMessage837Xsd() },
      );
      targetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(targetDefinition).document!;
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(getX12837PXslt(), targetDoc, tree, paramsMap);
      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.length).toEqual(14);
      expect(links[0].sourceNodePath).toMatch('fx-GS-02');
      expect(links[0].targetNodePath).toMatch('fx-From');
      expect(links[1].sourceNodePath).toMatch('fx-GS-03');
      expect(links[1].targetNodePath).toMatch('fx-To');
      expect(links[2].sourceNodePath).toMatch('fx-GS-04');
      expect(links[2].targetNodePath).toMatch('fx-Date');
      expect(links[3].sourceNodePath).toMatch('fx-GS-05');
      expect(links[3].targetNodePath).toMatch('fx-Time');
      expect(links[4].sourceNodePath).toMatch('fx-Loop2000');
      expect(links[4].targetNodePath).toMatch('for-each');
      expect(links[5].sourceNodePath).toMatch('fx-CLM-01');
      expect(links[5].targetNodePath).toMatch('fx-SubmitterId');
      expect(links[6].sourceNodePath).toMatch('fx-CLM-02');
      expect(links[6].targetNodePath).toMatch('fx-MonetaryAmount');
      expect(links[7].sourceNodePath).toMatch('fx-C023-01');
      expect(links[7].targetNodePath).toMatch('fx-FacilityCodeValue');
      expect(links[8].sourceNodePath).toMatch('fx-C023-02');
      expect(links[8].targetNodePath).toMatch('fx-FacilityCodeQualifier');
      expect(links[9].sourceNodePath).toMatch('fx-C023-03');
      expect(links[9].targetNodePath).toMatch('fx-ClaimFrequencyTypeCode');
      expect(links[10].sourceNodePath).toMatch('fx-CLM-06');
      expect(links[10].targetNodePath).toMatch('fx-YesNoConditionOrResponseCodeFile');
      expect(links[11].sourceNodePath).toMatch('fx-CLM-07');
      expect(links[11].targetNodePath).toMatch('fx-ProviderAcceptAssignmentCode');
      expect(links[12].sourceNodePath).toMatch('fx-CLM-08');
      expect(links[12].targetNodePath).toMatch('fx-YesNoConditionOrResponseCodeBenefits');
      expect(links[13].sourceNodePath).toMatch('fx-CLM-09');
      expect(links[13].targetNodePath).toMatch('fx-ReleaseOfInformationCode');
    });

    it('should not generate mapping link from the source body root', () => {
      const sourceDefinition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'x12850Dfdl.xsd': getX12850DfdlXsd() },
      );
      sourceDoc = XmlSchemaDocumentService.createXmlSchemaDocument(sourceDefinition).document!;
      const targetDefinition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'invoice850.xsd': getInvoice850Xsd() },
      );
      targetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(targetDefinition).document!;
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(getX12850ForEachXslt(), targetDoc, tree, paramsMap);
      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.find((l) => l.sourceNodePath === 'sourceBody:X12-850.dfdl.xsd://')).toBeUndefined();
    });

    it('should generate mapping links for multiple for-each on a same target collection', () => {
      MappingSerializerService.deserialize(getShipOrderToShipOrderMultipleForEachXslt(), targetDoc, tree, paramsMap);
      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.length).toEqual(10);
    });

    it('should generate mapping links for multiple field item on a same target collection', () => {
      MappingSerializerService.deserialize(getShipOrderToShipOrderCollectionIndexXslt(), targetDoc, tree, paramsMap);
      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.length).toEqual(8);
    });

    it('should generate mapping links for JSON documents', () => {
      const jsonTargetDefinition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'shipOrder.json': getShipOrderJsonSchema() },
      );
      const jsonTargetDoc = JsonSchemaDocumentService.createJsonSchemaDocument(jsonTargetDefinition).document!;
      tree = new MappingTree(jsonTargetDoc.documentType, jsonTargetDoc.documentId, DocumentDefinitionType.JSON_SCHEMA);
      MappingSerializerService.deserialize(getShipOrderToShipOrderXslt(), jsonTargetDoc, tree, paramsMap);
    });

    it('should generate mapping links for JSON source body', () => {
      const jsonSourceDoc = TestUtil.createJSONSourceBodyOrderDoc();
      expect(jsonSourceDoc.getReferenceId({})).toEqual('');

      const emptyParamsMap = new Map<string, IDocument>();
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(getJsonBodyToShipOrderXslt(), targetDoc, tree, emptyParamsMap);
      const links = MappingLinksService.extractMappingLinks(tree, emptyParamsMap, jsonSourceDoc);
      expect(links.length).toBeGreaterThan(0);
      expect(links.some((l) => l.sourceNodePath.includes('OrderPerson'))).toBe(true);
    });

    it('should generate mapping links for parent references', () => {
      const orgSourceDefinition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'org.xsd': getOrgXsd() },
      );
      const orgSourceResult = XmlSchemaDocumentService.createXmlSchemaDocument(orgSourceDefinition);
      expect(orgSourceResult.validationStatus).toBe('success');
      const orgSourceDoc = orgSourceResult.document!;
      const contactsTargetDefinition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'contacts.xsd': getContactsXsd() },
      );
      const contactsResult = XmlSchemaDocumentService.createXmlSchemaDocument(contactsTargetDefinition);
      expect(contactsResult.validationStatus).toBe('success');
      const contactsTargetDoc = contactsResult.document!;

      tree = new MappingTree(
        contactsTargetDoc.documentType,
        contactsTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      MappingSerializerService.deserialize(getOrgToContactsXslt(), contactsTargetDoc, tree, paramsMap);

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, orgSourceDoc);

      expect(links.length).toBeGreaterThan(0);

      const orgNameLink = links.find(
        (link) => link.sourceNodePath.includes('Name') && link.targetNodePath.includes('OrgName'),
      );
      expect(orgNameLink).toBeDefined();

      const personNameLink = links.find(
        (link) => link.sourceNodePath.includes('Name') && link.targetNodePath.includes('PersonName'),
      );
      expect(personNameLink).toBeDefined();

      const emailLink = links.find(
        (link) => link.sourceNodePath.includes('Email') && link.targetNodePath.includes('Email'),
      );
      expect(emailLink).toBeDefined();
    });

    it('should generate mapping links for current() expressions', () => {
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(getShipOrderWithCurrentXslt(), targetDoc, tree, paramsMap);

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);

      expect(links.length).toEqual(7);
      expect(links[0].sourceNodePath).toMatch('OrderPerson');
      expect(links[0].targetNodePath).toMatch('OrderPerson');
      expect(links[1].sourceNodePath).toMatch('ShipTo');
      expect(links[1].targetNodePath).toMatch('ShipTo');
      expect(links[2].sourceNodePath).toMatch('Item');
      expect(links[2].targetNodePath).toMatch('/for-each');
      expect(links[3].sourceNodePath).toMatch('Title');
      expect(links[3].targetNodePath).toMatch(/for-each-.*fx-Item-.*fx-Title-.*/);
      expect(links[4].sourceNodePath).toMatch('OrderPerson');
      expect(links[4].targetNodePath).toMatch(/for-each-.*fx-Item-.*fx-Note-.*/);
      expect(links[5].sourceNodePath).toMatch('Quantity');
      expect(links[5].targetNodePath).toMatch(/for-each-.*fx-Item-.*fx-Quantity-.*/);
      expect(links[6].sourceNodePath).toMatch('Price');
      expect(links[6].targetNodePath).toMatch(/for-each-.*fx-Item-.*fx-Price-.*/);
    });
  });

  describe('isInSelectedMapping()', () => {
    it('should detect selected mapping', () => {
      const orderIdPath = 'sourceBody:Body://fx-ShipOrder-1234/fx-OrderId-1234';
      const shipToNamePath = 'sourceBody:Body://fx-ShipOrder-1234/fx-ShipTo-1234/fx-Name-1234';

      // Set selected node in store
      const store = useDocumentTreeStore.getState();
      store.setSelectedNode(orderIdPath, true);

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc, orderIdPath, true);
      expect(MappingLinksService.isNodeInSelectedMapping(links, orderIdPath)).toBeTruthy();
      expect(MappingLinksService.isNodeInSelectedMapping(links, shipToNamePath)).toBeFalsy();

      // Clean up
      store.clearSelection();
    });

    it('should select links by target node path when selectedNodeIsSource is false', () => {
      const allLinks = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      const firstTargetPath = allLinks[0].targetNodePath;

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc, firstTargetPath, false);
      const selectedLinks = links.filter((l) => l.isSelected);

      expect(selectedLinks.length).toBeGreaterThan(0);
      expect(selectedLinks.every((l) => l.targetNodePath === firstTargetPath)).toBeTruthy();
    });
  });

  describe('choice wrapper target paths', () => {
    it('should include choice wrapper segments in target paths for fields inside choice', () => {
      const targetDefinition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'schemaTest.xsd': getSchemaTestXsd() },
      );
      const choiceTargetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(targetDefinition).document!;
      const choiceTree = new MappingTree(
        choiceTargetDoc.documentType,
        choiceTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );

      const rootField = choiceTargetDoc.fields[0];
      DocumentUtilService.resolveTypeFragment(rootField);
      const personField = rootField.fields.find((f: IField) => f.name === 'person')!;
      DocumentUtilService.resolveTypeFragment(personField);
      const outerChoiceField = personField.fields.find((f: IField) => f.wrapperKind === 'choice')!;
      const innerChoiceField = outerChoiceField.fields.find((f: IField) => f.wrapperKind === 'choice')!;
      const emailField = innerChoiceField.fields.find((f: IField) => f.name === 'email')!;

      outerChoiceField.id = 'outer-choice';
      innerChoiceField.id = 'inner-choice';

      choiceTree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };
      const rootItem = new FieldItem(choiceTree, rootField);
      choiceTree.children.push(rootItem);
      const personItem = new FieldItem(rootItem, personField);
      rootItem.children.push(personItem);
      const emailItem = new FieldItem(personItem, emailField);
      personItem.children.push(emailItem);
      const valueSelector = new ValueSelector(emailItem);
      valueSelector.expression = '/ns0:ShipOrder/ns0:OrderPerson';
      emailItem.children.push(valueSelector);

      const links = MappingLinksService.extractMappingLinks(choiceTree, paramsMap, sourceDoc);
      expect(links.length).toEqual(1);
      expect(links[0].targetNodePath).toEqual(
        `targetBody:Body://${rootItem.id}/${personItem.id}/outer-choice/inner-choice/${emailItem.id}`,
      );
      expect(emailItem.nodePath.toString()).not.toContain('outer-choice');
    });

    it('should exclude selected choice wrapper segments from target paths', () => {
      const targetDefinition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'schemaTest.xsd': getSchemaTestXsd() },
      );
      const choiceTargetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(targetDefinition).document!;
      const choiceTree = new MappingTree(
        choiceTargetDoc.documentType,
        choiceTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );

      const rootField = choiceTargetDoc.fields[0];
      DocumentUtilService.resolveTypeFragment(rootField);
      const personField = rootField.fields.find((f: IField) => f.name === 'person')!;
      DocumentUtilService.resolveTypeFragment(personField);
      const outerChoiceField = personField.fields.find((f: IField) => f.wrapperKind === 'choice')!;
      const innerChoiceField = outerChoiceField.fields.find((f: IField) => f.wrapperKind === 'choice')!;
      const emailField = innerChoiceField.fields.find((f: IField) => f.name === 'email')!;

      outerChoiceField.id = 'outer-choice';
      innerChoiceField.id = 'inner-choice';
      outerChoiceField.selectedMemberIndex = 0;
      innerChoiceField.selectedMemberIndex = 0;

      choiceTree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };
      const rootItem = new FieldItem(choiceTree, rootField);
      choiceTree.children.push(rootItem);
      const personItem = new FieldItem(rootItem, personField);
      rootItem.children.push(personItem);
      const emailItem = new FieldItem(personItem, emailField);
      personItem.children.push(emailItem);
      const valueSelector = new ValueSelector(emailItem);
      valueSelector.expression = '/ns0:ShipOrder/ns0:OrderPerson';
      emailItem.children.push(valueSelector);

      const links = MappingLinksService.extractMappingLinks(choiceTree, paramsMap, sourceDoc);
      expect(links.length).toEqual(1);
      expect(links[0].targetNodePath).toEqual(`targetBody:Body://${rootItem.id}/${personItem.id}/${emailField.id}`);
    });

    it('should only include unselected choice wrapper segments when mixed', () => {
      const targetDefinition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'schemaTest.xsd': getSchemaTestXsd() },
      );
      const choiceTargetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(targetDefinition).document!;
      const choiceTree = new MappingTree(
        choiceTargetDoc.documentType,
        choiceTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );

      const rootField = choiceTargetDoc.fields[0];
      DocumentUtilService.resolveTypeFragment(rootField);
      const personField = rootField.fields.find((f: IField) => f.name === 'person')!;
      DocumentUtilService.resolveTypeFragment(personField);
      const outerChoiceField = personField.fields.find((f: IField) => f.wrapperKind === 'choice')!;
      const innerChoiceField = outerChoiceField.fields.find((f: IField) => f.wrapperKind === 'choice')!;
      const emailField = innerChoiceField.fields.find((f: IField) => f.name === 'email')!;

      outerChoiceField.id = 'outer-choice';
      innerChoiceField.id = 'inner-choice';
      outerChoiceField.selectedMemberIndex = 0;

      choiceTree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };
      const rootItem = new FieldItem(choiceTree, rootField);
      choiceTree.children.push(rootItem);
      const personItem = new FieldItem(rootItem, personField);
      rootItem.children.push(personItem);
      const emailItem = new FieldItem(personItem, emailField);
      personItem.children.push(emailItem);
      const valueSelector = new ValueSelector(emailItem);
      valueSelector.expression = '/ns0:ShipOrder/ns0:OrderPerson';
      emailItem.children.push(valueSelector);

      const links = MappingLinksService.extractMappingLinks(choiceTree, paramsMap, sourceDoc);
      expect(links.length).toEqual(1);
      expect(links[0].targetNodePath).toEqual(
        `targetBody:Body://${rootItem.id}/${personItem.id}/inner-choice/${emailItem.id}`,
      );
    });
  });

  describe('abstract field mapping paths', () => {
    const NS_SUBSTITUTION = 'http://www.example.com/SUBSTITUTION';

    const createZooDoc = (docType: DocumentType) => {
      const definition = new DocumentDefinition(docType, DocumentDefinitionType.XML_SCHEMA, BODY_DOCUMENT_ID, {
        'FieldSubstitution.xsd': getFieldSubstitutionXsd(),
      });
      definition.rootElementChoice = { namespaceUri: NS_SUBSTITUTION, name: 'Zoo' };
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      const document = result.document!;
      const zooField = document.fields[0];
      const abstractAnimalField = zooField.fields.find(
        (f: IField) => f.wrapperKind === 'abstract' && f.name === 'AbstractAnimal',
      )!;
      const catIndex = abstractAnimalField.fields.findIndex((f: IField) => f.name === 'Cat');
      abstractAnimalField.selectedMemberIndex = catIndex;
      const catField = abstractAnimalField.fields[catIndex];
      DocumentUtilService.resolveTypeFragment(catField);
      const indoorField = catField.fields.find((f: IField) => f.name === 'indoor')!;
      return { document, zooField, abstractAnimalField, catField, indoorField };
    };

    it('should exclude selected abstract wrapper segments from source paths', () => {
      const { document: zooDoc, abstractAnimalField, catField, indoorField } = createZooDoc(DocumentType.SOURCE_BODY);

      const abstractTree = new MappingTree(
        targetDoc.documentType,
        targetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      abstractTree.namespaceMap = { ns0: NS_SUBSTITUTION };

      const targetRootField = targetDoc.fields[0];
      DocumentUtilService.resolveTypeFragment(targetRootField);
      const orderIdField = targetRootField.fields.find((f: IField) => f.name === 'OrderId')!;
      const rootItem = new FieldItem(abstractTree, targetRootField);
      abstractTree.children.push(rootItem);
      const orderIdItem = new FieldItem(rootItem, orderIdField);
      rootItem.children.push(orderIdItem);
      const valueSelector = new ValueSelector(orderIdItem);
      valueSelector.expression = '/ns0:Zoo/ns0:Cat/ns0:indoor';
      orderIdItem.children.push(valueSelector);

      const links = MappingLinksService.extractMappingLinks(abstractTree, paramsMap, zooDoc);
      expect(links.length).toEqual(1);
      expect(links[0].sourceNodePath).toContain(catField.id);
      expect(links[0].sourceNodePath).toContain(indoorField.id);
      expect(links[0].sourceNodePath).not.toContain(abstractAnimalField.id);
    });

    it('should exclude selected abstract wrapper segments from target paths', () => {
      const {
        document: zooTargetDoc,
        zooField,
        abstractAnimalField,
        catField,
        indoorField,
      } = createZooDoc(DocumentType.TARGET_BODY);

      const zooTree = new MappingTree(
        zooTargetDoc.documentType,
        zooTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      zooTree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };

      const rootItem = new FieldItem(zooTree, zooField);
      zooTree.children.push(rootItem);
      const catItem = new FieldItem(rootItem, catField);
      rootItem.children.push(catItem);
      const indoorItem = new FieldItem(catItem, indoorField);
      catItem.children.push(indoorItem);
      const valueSelector = new ValueSelector(indoorItem);
      valueSelector.expression = '/ns0:ShipOrder/ns0:OrderPerson';
      indoorItem.children.push(valueSelector);

      const links = MappingLinksService.extractMappingLinks(zooTree, paramsMap, sourceDoc);
      expect(links.length).toEqual(1);
      expect(links[0].targetNodePath).toContain(catField.id);
      expect(links[0].targetNodePath).toContain(indoorField.id);
      expect(links[0].targetNodePath).not.toContain(abstractAnimalField.id);
    });

    it('should include unselected abstract wrapper segments in target paths', () => {
      const {
        document: zooTargetDoc,
        zooField,
        abstractAnimalField,
        catField,
        indoorField,
      } = createZooDoc(DocumentType.TARGET_BODY);
      abstractAnimalField.selectedMemberIndex = undefined;

      const zooTree = new MappingTree(
        zooTargetDoc.documentType,
        zooTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      zooTree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };

      const rootItem = new FieldItem(zooTree, zooField);
      zooTree.children.push(rootItem);
      const catItem = new FieldItem(rootItem, catField);
      rootItem.children.push(catItem);
      const indoorItem = new FieldItem(catItem, indoorField);
      catItem.children.push(indoorItem);
      const valueSelector = new ValueSelector(indoorItem);
      valueSelector.expression = '/ns0:ShipOrder/ns0:OrderPerson';
      indoorItem.children.push(valueSelector);

      const links = MappingLinksService.extractMappingLinks(zooTree, paramsMap, sourceDoc);
      expect(links.length).toEqual(1);
      expect(links[0].targetNodePath).toContain(abstractAnimalField.id);
    });
  });

  describe('when XPath validation fails', () => {
    it('should return empty links for invalid XPath expressions', () => {
      const validateSpy = jest.spyOn(XPathService, 'validate').mockReturnValue({
        getExprNode: () => null,
        dataMapperErrors: [],
      } as never);

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links).toHaveLength(0);

      validateSpy.mockRestore();
    });
  });
});
