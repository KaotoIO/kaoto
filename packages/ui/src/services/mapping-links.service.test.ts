import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
} from '../models/datamapper/document';
import { MappingTree } from '../models/datamapper/mapping';
import { useDocumentTreeStore } from '../store';
import { mockRandomValues } from '../stubs';
import {
  getContactsXsd,
  getInvoice850Xsd,
  getJsonBodyToShipOrderXslt,
  getMessage837Xsd,
  getOrgToContactsXslt,
  getOrgXsd,
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
} from '../stubs/datamapper/data-mapper';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { MappingLinksService } from './mapping-links.service';
import { MappingSerializerService } from './mapping-serializer.service';
import { XmlSchemaDocument } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
import { XPathService } from './xpath/xpath.service';

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
