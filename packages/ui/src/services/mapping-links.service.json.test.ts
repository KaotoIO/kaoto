import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  PrimitiveDocument,
} from '../models/datamapper/document';
import { MappingTree } from '../models/datamapper/mapping';
import { useDocumentTreeStore } from '../store';
import { mockRandomValues } from '../stubs';
import {
  accountJsonSchema,
  cartJsonSchema,
  shipOrderJsonSchema,
  shipOrderJsonXslt,
} from '../stubs/datamapper/data-mapper';
import { JsonSchemaDocument } from './json-schema-document.model';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { MappingLinksService } from './mapping-links.service';
import { MappingSerializerService } from './mapping-serializer.service';

describe('MappingLinksService : JSON', () => {
  let cartParamDoc: JsonSchemaDocument;
  let accountParamDoc: JsonSchemaDocument;
  let targetDoc: JsonSchemaDocument;
  let paramsMap: Map<string, IDocument>;
  let mappingTree: MappingTree;
  const dummySourceBodyDoc = new PrimitiveDocument(
    new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
  );

  beforeAll(() => {
    mockRandomValues();
  });

  beforeEach(() => {
    const accountDefinition = new DocumentDefinition(
      DocumentType.PARAM,
      DocumentDefinitionType.JSON_SCHEMA,
      'Account',
      { 'Account.json': accountJsonSchema },
    );
    const accountResult = JsonSchemaDocumentService.createJsonSchemaDocument(accountDefinition);
    expect(accountResult.validationStatus).toBe('success');
    accountParamDoc = accountResult.document as JsonSchemaDocument;
    const cartDefinition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'Cart', {
      'Cart.json': cartJsonSchema,
    });
    const cartResult = JsonSchemaDocumentService.createJsonSchemaDocument(cartDefinition);
    expect(cartResult.validationStatus).toBe('success');
    cartParamDoc = cartResult.document as JsonSchemaDocument;
    const orderSequenceParamDoc = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'OrderSequence'),
    );
    paramsMap = new Map<string, IDocument>([
      ['OrderSequence', orderSequenceParamDoc],
      ['Account', accountParamDoc],
      ['Cart', cartParamDoc],
    ]);
    const targetDefinition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.JSON_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'ShipOrder.json': shipOrderJsonSchema },
    );
    const targetResult = JsonSchemaDocumentService.createJsonSchemaDocument(targetDefinition);
    expect(targetResult.validationStatus).toBe('success');
    targetDoc = targetResult.document as JsonSchemaDocument;
    mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.JSON_SCHEMA);
    MappingSerializerService.deserialize(shipOrderJsonXslt, targetDoc, mappingTree, paramsMap);
  });

  describe('extractMappingLinks()', () => {
    it('should return IMappingLink[]', () => {
      const links = MappingLinksService.extractMappingLinks(
        mappingTree,
        paramsMap,
        new PrimitiveDocument(
          new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        ),
      );
      expect(links.length).toEqual(13);
      expect(links[0].sourceNodePath).toMatch('fj-string-AccountId');
      expect(links[0].targetNodePath).toMatch('fj-string-OrderId');
      expect(links[1].sourceNodePath).toMatch('param:OrderSequence');
      expect(links[1].targetNodePath).toMatch('fj-string-OrderId');
      expect(links[2].sourceNodePath).toMatch('fj-string-AccountId');
      expect(links[2].targetNodePath).toMatch('fj-string-OrderPerson');
      expect(links[3].sourceNodePath).toMatch('fj-string-Name');
      expect(links[3].targetNodePath).toMatch('fj-string-OrderPerson');
      expect(links[4].sourceNodePath).toMatch('fj-string-Name');
      expect(links[4].targetNodePath).toMatch(/fj-map-ShipTo.*fj-string-Name/);
      expect(links[5].sourceNodePath).toMatch(/fj-map-Address.*fj-string-Street/);
      expect(links[5].targetNodePath).toMatch(/fj-map-ShipTo.*fj-string-Street/);
      expect(links[6].sourceNodePath).toMatch(/fj-map-Address.*fj-string-City/);
      expect(links[6].targetNodePath).toMatch(/fj-map-ShipTo.*fj-string-City/);
      expect(links[7].sourceNodePath).toMatch(/fj-map-Address.*fj-string-State/);
      expect(links[7].targetNodePath).toMatch(/fj-map-ShipTo.*fj-string-State/);
      expect(links[8].sourceNodePath).toMatch(/fj-map-Address.*fj-string-Country/);
      expect(links[8].targetNodePath).toMatch(/fj-map-ShipTo.*fj-string-Country/);
      expect(links[9].sourceNodePath).toMatch(/param:Cart.*fj-array.*fj-map/);
      expect(links[9].targetNodePath).toMatch(/fj-map.*fj-array-Item.*for-each/);
      expect(links[10].sourceNodePath).toMatch(/param:Cart.*fj-array.*fj-map.*fj-string-Title/);
      expect(links[10].targetNodePath).toMatch(/fj-map.*fj-array-Item.*for-each.*fj-map.*fj-string-Title/);
      expect(links[11].sourceNodePath).toMatch(/param:Cart.*fj-array.*fj-map.*fj-number-Quantity/);
      expect(links[11].targetNodePath).toMatch(/fj-map.*fj-array-Item.*for-each.*fj-map.*fj-number-Quantity/);
      expect(links[12].sourceNodePath).toMatch(/param:Cart.*fj-array.*fj-map.*fj-number-Price/);
      expect(links[12].targetNodePath).toMatch(/fj-map.*fj-array-Item.*for-each.*fj-map.*fj-number-Price/);
    });
  });

  describe('isInSelectedMapping()', () => {
    it('should detect selected mapping', () => {
      const orderIdPath = 'param:Account://fj-map-1234/fj-string-AccountId-1234';
      const namePath = 'param:Account://fj-map-1234/fj-string-Name-1234';

      // Set selected node in store
      const store = useDocumentTreeStore.getState();
      store.setSelectedNode(orderIdPath, true);

      const links = MappingLinksService.extractMappingLinks(
        mappingTree,
        paramsMap,
        dummySourceBodyDoc,
        orderIdPath,
        true,
      );
      expect(MappingLinksService.isNodeInSelectedMapping(links, orderIdPath)).toBeTruthy();
      expect(MappingLinksService.isNodeInSelectedMapping(links, namePath)).toBeFalsy();

      // Clean up
      store.clearSelection();
    });
  });
});
