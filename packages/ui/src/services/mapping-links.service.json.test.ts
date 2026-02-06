import { renderHook } from '@testing-library/react';
import { RefObject, useRef } from 'react';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  PrimitiveDocument,
} from '../models/datamapper/document';
import { MappingTree } from '../models/datamapper/mapping';
import { NodeReference } from '../models/datamapper/visualization';
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
      const { result: refOrderId } = renderHook(() =>
        useRef<NodeReference>({
          path: 'param:Account://fj-map-1234/fj-string-AccountId-1234',
          isSource: true,
          containerRef: null,
          headerRef: null,
        }),
      );
      const { result: refName } = renderHook(() =>
        useRef<NodeReference>({
          path: 'param:Account://fj-map-1234/fj-string-Name-1234',
          isSource: true,
          containerRef: null,
          headerRef: null,
        }),
      );
      const links = MappingLinksService.extractMappingLinks(
        mappingTree,
        paramsMap,
        dummySourceBodyDoc,
        refOrderId.current,
      );
      expect(MappingLinksService.isInSelectedMapping(links, refOrderId.current)).toBeTruthy();
      expect(MappingLinksService.isInSelectedMapping(links, refName.current)).toBeFalsy();
    });
  });

  describe('calculateMappingLinkCoordinates()', () => {
    const nodeReferences: Map<string, RefObject<NodeReference>> = new Map<string, RefObject<NodeReference>>();

    const mockRect = () => ({ a: 0, b: 0 });
    const mockClosest = () => null;
    const createMockHeaderRef = (): HTMLDivElement =>
      ({
        getBoundingClientRect: mockRect,
        getClientRects: mockRect,
        closest: mockClosest,
      }) as unknown as HTMLDivElement;

    const createNodeReference = (path: string) => {
      const { result } = renderHook(() =>
        useRef<NodeReference>({
          path: path,
          isSource: !path.startsWith('target'),
          containerRef: null,
          headerRef: createMockHeaderRef(),
        }),
      );
      nodeReferences.set(path, result.current);
    };

    const getNodeReference = (path: string): RefObject<NodeReference> => {
      if (!nodeReferences.has(path)) createNodeReference(path);
      return nodeReferences.get(path)!;
    };

    beforeEach(() => {
      nodeReferences.clear();
    });

    it('should move selected mapping lines to last', () => {
      const svgRef: RefObject<SVGSVGElement> = {
        /* tslint:disable-next-line */
        current: {
          getBoundingClientRect: jest.fn(),
        } as unknown as SVGSVGElement,
      };

      const refAddressStreetId = getNodeReference(
        'param:Account://fj-map-1234/fj-map-Address-1234/fj-string-Street-1234',
      );

      const links = MappingLinksService.extractMappingLinks(
        mappingTree,
        paramsMap,
        dummySourceBodyDoc,
        refAddressStreetId,
      );
      expect(links.length).toEqual(13);
      expect(links[5].sourceNodePath).toContain('fj-string-Street');
      expect(links[5].targetNodePath).toContain('fj-string-Street');
      expect(links[5].isSelected).toBeTruthy();
      const lineProps = MappingLinksService.calculateMappingLinkCoordinates(links, svgRef, getNodeReference);
      expect(lineProps.length).toEqual(13);
      expect(lineProps[5].sourceNodePath).not.toContain('fj-string-Street');
      expect(lineProps[5].isSelected).toBeFalsy();
      expect(lineProps[12].sourceNodePath).toContain('fj-string-Street');
      expect(lineProps[12].targetNodePath).toContain('fj-string-Street');
      expect(lineProps[12].isSelected).toBeTruthy();
    });
  });
});
