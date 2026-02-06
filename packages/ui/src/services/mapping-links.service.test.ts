import { renderHook } from '@testing-library/react';
import { RefObject, useRef } from 'react';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
} from '../models/datamapper/document';
import { MappingTree } from '../models/datamapper/mapping';
import { NodeReference } from '../models/datamapper/visualization';
import { mockRandomValues } from '../stubs';
import {
  contactsXsd,
  invoice850Xsd,
  message837Xsd,
  orgToContactsXslt,
  orgXsd,
  shipOrderJsonSchema,
  shipOrderToShipOrderCollectionIndexXslt,
  shipOrderToShipOrderMultipleForEachXslt,
  shipOrderToShipOrderXslt,
  shipOrderWithCurrentXslt,
  TestUtil,
  x12837PDfdlXsd,
  x12837PXslt,
  x12850DfdlXsd,
  x12850ForEachXslt,
} from '../stubs/datamapper/data-mapper';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { MappingLinksService } from './mapping-links.service';
import { MappingSerializerService } from './mapping-serializer.service';
import { XmlSchemaDocument } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';

// Helper function to create node references for tests - extracted to reduce nesting depth
const mockRect = () => ({ a: 0, b: 0 });

function createNodeReferenceHelper(
  path: string,
  nodeReferences: Map<string, RefObject<NodeReference>>,
): RefObject<NodeReference> {
  const nodeRefConfig: NodeReference = {
    path: path,
    isSource: !path.startsWith('target'),
    containerRef: null,
    headerRef: {
      getBoundingClientRect: mockRect,
      getClientRects: mockRect,
      closest: () => null,
    } as unknown as HTMLDivElement,
  };
  const { result } = renderHook(() => useRef<NodeReference>(nodeRefConfig));
  nodeReferences.set(path, result.current);
  return result.current;
}

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
    MappingSerializerService.deserialize(shipOrderToShipOrderXslt, targetDoc, tree, paramsMap);
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
        { 'x12837PDfdl.xsd': x12837PDfdlXsd },
      );
      sourceDoc = XmlSchemaDocumentService.createXmlSchemaDocument(sourceDefinition).document!;
      const targetDefinition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'message837.xsd': message837Xsd },
      );
      targetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(targetDefinition).document!;
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(x12837PXslt, targetDoc, tree, paramsMap);
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
        { 'x12850Dfdl.xsd': x12850DfdlXsd },
      );
      sourceDoc = XmlSchemaDocumentService.createXmlSchemaDocument(sourceDefinition).document!;
      const targetDefinition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'invoice850.xsd': invoice850Xsd },
      );
      targetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(targetDefinition).document!;
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(x12850ForEachXslt, targetDoc, tree, paramsMap);
      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.find((l) => l.sourceNodePath === 'sourceBody:X12-850.dfdl.xsd://')).toBeUndefined();
    });

    it('should generate mapping links for multiple for-each on a same target collection', () => {
      MappingSerializerService.deserialize(shipOrderToShipOrderMultipleForEachXslt, targetDoc, tree, paramsMap);
      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.length).toEqual(10);
    });

    it('should generate mapping links for multiple field item on a same target collection', () => {
      MappingSerializerService.deserialize(shipOrderToShipOrderCollectionIndexXslt, targetDoc, tree, paramsMap);
      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.length).toEqual(8);
    });

    it('should generate mapping links for JSON documents', () => {
      const jsonTargetDefinition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'shipOrder.json': shipOrderJsonSchema },
      );
      const jsonTargetDoc = JsonSchemaDocumentService.createJsonSchemaDocument(jsonTargetDefinition).document!;
      tree = new MappingTree(jsonTargetDoc.documentType, jsonTargetDoc.documentId, DocumentDefinitionType.JSON_SCHEMA);
      MappingSerializerService.deserialize(shipOrderToShipOrderXslt, jsonTargetDoc, tree, paramsMap);
    });

    it('should generate mapping links for parent references', () => {
      const orgSourceDefinition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'org.xsd': orgXsd },
      );
      const orgSourceResult = XmlSchemaDocumentService.createXmlSchemaDocument(orgSourceDefinition);
      expect(orgSourceResult.validationStatus).toBe('success');
      const orgSourceDoc = orgSourceResult.document!;
      const contactsTargetDefinition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'contacts.xsd': contactsXsd },
      );
      const contactsResult = XmlSchemaDocumentService.createXmlSchemaDocument(contactsTargetDefinition);
      expect(contactsResult.validationStatus).toBe('success');
      const contactsTargetDoc = contactsResult.document!;

      tree = new MappingTree(
        contactsTargetDoc.documentType,
        contactsTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      MappingSerializerService.deserialize(orgToContactsXslt, contactsTargetDoc, tree, paramsMap);

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
      MappingSerializerService.deserialize(shipOrderWithCurrentXslt, targetDoc, tree, paramsMap);

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
      const { result: refOrderId } = renderHook(() =>
        useRef<NodeReference>({
          path: 'sourceBody:Body://fx-ShipOrder-1234/fx-OrderId-1234',
          isSource: true,
          containerRef: null,
          headerRef: null,
        }),
      );
      const { result: refShipToName } = renderHook(() =>
        useRef<NodeReference>({
          path: 'sourceBody:Body://fx-ShipOrder-1234/fx-ShipTo-1234/fx-Name-1234',
          isSource: true,
          containerRef: null,
          headerRef: null,
        }),
      );
      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc, refOrderId.current);
      expect(MappingLinksService.isInSelectedMapping(links, refOrderId.current)).toBeTruthy();
      expect(MappingLinksService.isInSelectedMapping(links, refShipToName.current)).toBeFalsy();
    });
  });

  describe('calculateMappingLinkCoordinates()', () => {
    const nodeReferences: Map<string, RefObject<NodeReference>> = new Map<string, RefObject<NodeReference>>();

    const getNodeReference = (path: string): RefObject<NodeReference> => {
      if (!nodeReferences.has(path)) {
        createNodeReferenceHelper(path, nodeReferences);
      }
      return nodeReferences.get(path)!;
    };

    // Helper to create mock closest function for expansion panel tests
    const createMockClosest = (mockScrollContainer: unknown) => (s: string) => {
      if (s === '.expansion-panel__summary') return null;
      if (s === '.expansion-panel__content') return mockScrollContainer;
      return null;
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

      const refOrderId = getNodeReference('sourceBody:Body://fx-ShipOrder-1234/fx-OrderId-1234');

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc, refOrderId);
      expect(links.length).toEqual(11);
      expect(links[0].sourceNodePath).toContain('fx-OrderId');
      expect(links[0].targetNodePath).toContain('fx-OrderId');
      expect(links[0].isSelected).toBeTruthy();
      const lineProps = MappingLinksService.calculateMappingLinkCoordinates(links, svgRef, getNodeReference);
      expect(lineProps.length).toEqual(11);
      expect(lineProps[0].sourceNodePath).not.toContain('fx-OrderId');
      expect(lineProps[0].isSelected).toBeFalsy();
      expect(lineProps[10].sourceNodePath).toContain('fx-OrderId');
      expect(lineProps[10].targetNodePath).toContain('fx-OrderId');
      expect(lineProps[10].isSelected).toBeTruthy();
    });

    it('should handle null source or target rect', () => {
      const svgRef: RefObject<SVGSVGElement> = {
        current: {
          getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100 }),
        } as unknown as SVGSVGElement,
      };

      // Create mock header ref with null getBoundingClientRect
      const mockHeaderRefWithNull = {
        getBoundingClientRect: () => null,
        getClientRects: () => ({ length: 1 }),
      } as unknown as HTMLDivElement;

      const nodeRefConfig: NodeReference = {
        path: 'sourceBody:Body://fx-ShipOrder-1234/fx-OrderId-1234',
        isSource: true,
        containerRef: null,
        headerRef: mockHeaderRefWithNull,
      };

      const { result: sourceRefWithNull } = renderHook(() => useRef<NodeReference>(nodeRefConfig));
      nodeReferences.set('sourceBody:Body://fx-ShipOrder-1234/fx-OrderId-1234', sourceRefWithNull.current);

      const links = [
        {
          sourceNodePath: 'sourceBody:Body://fx-ShipOrder-1234/fx-OrderId-1234',
          targetNodePath: 'targetBody:Body://fx-ShipOrder-1234/fx-OrderId-1234',
          isSelected: false,
        },
      ];

      const lineProps = MappingLinksService.calculateMappingLinkCoordinates(links, svgRef, getNodeReference);
      // Should return empty array when rect is null
      expect(lineProps.length).toEqual(0);
    });

    it('should calculate coordinates using node row rects when available', () => {
      const svgRef: RefObject<SVGSVGElement> = {
        current: {
          getBoundingClientRect: () => ({ left: 10, top: 20, right: 500, bottom: 600 }),
        } as unknown as SVGSVGElement,
      };

      // Mock node rows with querySelector
      const mockNodeRow = {
        getBoundingClientRect: () => ({ left: 50, top: 100, right: 200, bottom: 120 }),
      };

      // Create mock header refs with querySelector
      const mockSourceHeaderRef = {
        getBoundingClientRect: () => ({ left: 40, top: 100, right: 190, bottom: 120 }),
        getClientRects: () => ({ length: 1 }),
        querySelector: () => mockNodeRow,
        closest: () => null,
      } as unknown as HTMLDivElement;

      const mockTargetHeaderRef = {
        getBoundingClientRect: () => ({ left: 300, top: 100, right: 450, bottom: 120 }),
        getClientRects: () => ({ length: 1 }),
        querySelector: () => mockNodeRow,
        closest: () => null,
      } as unknown as HTMLDivElement;

      const sourceNodeRefConfig: NodeReference = {
        path: 'sourceBody:Body://fx-ShipOrder-1234/fx-OrderId-1234',
        isSource: true,
        containerRef: null,
        headerRef: mockSourceHeaderRef,
      };

      const targetNodeRefConfig: NodeReference = {
        path: 'targetBody:Body://fx-ShipOrder-1234/fx-OrderId-1234',
        isSource: false,
        containerRef: null,
        headerRef: mockTargetHeaderRef,
      };

      const { result: sourceRefWithRow } = renderHook(() => useRef<NodeReference>(sourceNodeRefConfig));
      const { result: targetRefWithRow } = renderHook(() => useRef<NodeReference>(targetNodeRefConfig));

      nodeReferences.set('sourceBody:Body://fx-ShipOrder-1234/fx-OrderId-1234', sourceRefWithRow.current);
      nodeReferences.set('targetBody:Body://fx-ShipOrder-1234/fx-OrderId-1234', targetRefWithRow.current);

      const links = [
        {
          sourceNodePath: 'sourceBody:Body://fx-ShipOrder-1234/fx-OrderId-1234',
          targetNodePath: 'targetBody:Body://fx-ShipOrder-1234/fx-OrderId-1234',
          isSelected: false,
        },
      ];

      const lineProps = MappingLinksService.calculateMappingLinkCoordinates(links, svgRef, getNodeReference);
      expect(lineProps.length).toEqual(1);
      expect(lineProps[0].x1).toBeDefined();
      expect(lineProps[0].y1).toBeDefined();
      expect(lineProps[0].x2).toBeDefined();
      expect(lineProps[0].y2).toBeDefined();
      // Verify that coordinates were calculated using node row rect
      expect(lineProps[0].x1).toBeGreaterThan(0);
      expect(lineProps[0].x2).toBeGreaterThan(0);
    });

    it('should clamp y coordinates to scroll container boundaries', () => {
      const mockGetBoundingRect = () => ({ left: 0, top: 0 });
      const svgRef: RefObject<SVGSVGElement> = {
        current: { getBoundingClientRect: mockGetBoundingRect } as unknown as SVGSVGElement,
      };

      const mockScrollContainerGetBoundingRect = () => ({ top: 50, bottom: 150 });
      const mockPanel = {
        dataset: { expanded: 'true' },
        querySelector: () => null,
      } as unknown as HTMLElement;
      const mockScrollContainer = {
        getBoundingClientRect: mockScrollContainerGetBoundingRect,
        closest: (s: string) => (s === '.expansion-panel' ? mockPanel : null),
      };
      const mockGetClientRects = () => ({ length: 1 });
      const mockClosest = createMockClosest(mockScrollContainer);

      const sourceHeaderRef = {
        getBoundingClientRect: () => ({ left: 40, top: 200, right: 190, bottom: 220 }),
        getClientRects: mockGetClientRects,
        closest: mockClosest,
      } as unknown as HTMLDivElement;

      const targetHeaderRef = {
        getBoundingClientRect: () => ({ left: 40, top: 10, right: 190, bottom: 30 }),
        getClientRects: mockGetClientRects,
        closest: mockClosest,
      } as unknown as HTMLDivElement;

      const sourceNodeRefConfig: NodeReference = {
        path: 'sourceBody:Body://fx-Clamped',
        isSource: true,
        containerRef: null,
        headerRef: sourceHeaderRef,
      };

      const targetNodeRefConfig: NodeReference = {
        path: 'targetBody:Body://fx-Clamped',
        isSource: false,
        containerRef: null,
        headerRef: targetHeaderRef,
      };

      const { result: sourceRef } = renderHook(() => useRef<NodeReference>(sourceNodeRefConfig));
      const { result: targetRef } = renderHook(() => useRef<NodeReference>(targetNodeRefConfig));

      nodeReferences.set('sourceBody:Body://fx-Clamped', sourceRef.current);
      nodeReferences.set('targetBody:Body://fx-Clamped', targetRef.current);

      const links = [
        {
          sourceNodePath: 'sourceBody:Body://fx-Clamped',
          targetNodePath: 'targetBody:Body://fx-Clamped',
          isSelected: false,
        },
      ];

      const lineProps = MappingLinksService.calculateMappingLinkCoordinates(links, svgRef, getNodeReference);
      expect(lineProps[0].y1).toEqual(150); // clamped to container bottom
      expect(lineProps[0].y2).toEqual(50); // clamped to container top
    });

    it('should snap to summary center when panel is collapsed', () => {
      const mockGetBoundingRect = () => ({ left: 0, top: 0 });
      const svgRef: RefObject<SVGSVGElement> = {
        current: { getBoundingClientRect: mockGetBoundingRect } as unknown as SVGSVGElement,
      };

      const mockSummaryGetBoundingRect = () => ({ top: 100, bottom: 140 });
      const mockSummary = { getBoundingClientRect: mockSummaryGetBoundingRect };
      const mockPanel = {
        dataset: { expanded: 'false' },
        querySelector: (s: string) => (s === '.expansion-panel__summary' ? mockSummary : null),
      } as unknown as HTMLElement;
      const mockScrollContainerGetBoundingRect = () => ({ top: 140, bottom: 400 });
      const mockScrollContainer = {
        getBoundingClientRect: mockScrollContainerGetBoundingRect,
        closest: (s: string) => (s === '.expansion-panel' ? mockPanel : null),
      };
      const mockGetClientRects = () => ({ length: 1 });
      const mockClosest = createMockClosest(mockScrollContainer);

      const sourceHeaderRef = {
        getBoundingClientRect: () => ({ left: 40, top: 200, right: 190, bottom: 220 }),
        getClientRects: mockGetClientRects,
        closest: mockClosest,
      } as unknown as HTMLDivElement;

      const targetHeaderRef = {
        getBoundingClientRect: () => ({ left: 40, top: 250, right: 190, bottom: 270 }),
        getClientRects: mockGetClientRects,
        closest: mockClosest,
      } as unknown as HTMLDivElement;

      const sourceNodeRefConfig: NodeReference = {
        path: 'sourceBody:Body://fx-Collapsed',
        isSource: true,
        containerRef: null,
        headerRef: sourceHeaderRef,
      };

      const targetNodeRefConfig: NodeReference = {
        path: 'targetBody:Body://fx-Collapsed',
        isSource: false,
        containerRef: null,
        headerRef: targetHeaderRef,
      };

      const { result: sourceRef } = renderHook(() => useRef<NodeReference>(sourceNodeRefConfig));
      const { result: targetRef } = renderHook(() => useRef<NodeReference>(targetNodeRefConfig));

      nodeReferences.set('sourceBody:Body://fx-Collapsed', sourceRef.current);
      nodeReferences.set('targetBody:Body://fx-Collapsed', targetRef.current);

      const links = [
        {
          sourceNodePath: 'sourceBody:Body://fx-Collapsed',
          targetNodePath: 'targetBody:Body://fx-Collapsed',
          isSelected: false,
        },
      ];

      const lineProps = MappingLinksService.calculateMappingLinkCoordinates(links, svgRef, getNodeReference);
      expect(lineProps[0].y1).toEqual(120); // snapped to summary center (100 + (140-100)/2)
      expect(lineProps[0].y2).toEqual(120); // snapped to summary center (100 + (140-100)/2)
    });
  });
});
