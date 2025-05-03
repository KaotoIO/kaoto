import { XmlSchemaDocument, XmlSchemaDocumentService } from './xml-schema-document.service';
import { MappingLinksService } from './mapping-links.service';
import {
  invoice850Xsd,
  message837Xsd,
  shipOrderToShipOrderCollectionIndexXslt,
  shipOrderToShipOrderMultipleForEachXslt,
  shipOrderToShipOrderXslt,
  TestUtil,
  x12837PDfdlXsd,
  x12837PXslt,
  x12850DfdlXsd,
  x12850ForEachXslt,
} from '../stubs/data-mapper';
import { IDocument } from '../models/datamapper/document';
import { MappingTree } from '../models/datamapper/mapping';
import { NodeReference } from '../models/datamapper/visualization';
import { MappingSerializerService } from './mapping-serializer.service';
import { DocumentType } from '../models/datamapper/path';
import { MutableRefObject, RefObject, useRef } from 'react';
import { renderHook } from '@testing-library/react';

describe('MappingLinksService', () => {
  let sourceDoc: XmlSchemaDocument;
  let targetDoc: XmlSchemaDocument;
  let paramsMap: Map<string, IDocument>;
  let tree: MappingTree;

  beforeEach(() => {
    sourceDoc = TestUtil.createSourceOrderDoc();
    targetDoc = TestUtil.createTargetOrderDoc();
    paramsMap = TestUtil.createParameterMap();
    tree = new MappingTree(targetDoc.documentType, targetDoc.documentId);
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
      expect(links[2].targetNodePath).toMatch(/if-.*field-OrderPerson/);
      expect(links[3].targetNodePath).toMatch('ShipTo');
      expect(links[3].targetNodePath).toMatch('ShipTo');
      expect(links[4].sourceNodePath).toMatch('Item');
      expect(links[4].targetNodePath).toMatch('/for-each');
      expect(links[5].sourceNodePath).toMatch('Title');
      expect(links[5].targetNodePath).toMatch(/for-each-.*field-Item-.*field-Title-.*/);
      expect(links[6].sourceNodePath).toMatch('Note');
      expect(links[6].targetNodePath).toMatch(/for-each-.*field-Item-.*choose-.*when-.*/);
      expect(links[7].sourceNodePath).toMatch('Note');
      expect(links[7].targetNodePath).toMatch(/for-each-.*field-Item-.*field-Note-.*/);
      expect(links[8].sourceNodePath).toMatch('Title');
      expect(links[8].targetNodePath).toMatch(/for-each-.*field-Item-.*choose-.*otherwise-.*field-Note-.*/);
      expect(links[9].sourceNodePath).toMatch('Quantity');
      expect(links[9].targetNodePath).toMatch(/for-each-.*field-Item-.*field-Quantity-.*/);
      expect(links[10].sourceNodePath).toMatch('Price');
      expect(links[10].targetNodePath).toMatch(/for-each-.*field-Item-.*field-Price-.*/);
    });

    it('should generate mapping links for the cached type fragments field', () => {
      sourceDoc = XmlSchemaDocumentService.createXmlSchemaDocument(
        DocumentType.SOURCE_BODY,
        'X12-837P.dfdl.xsd',
        x12837PDfdlXsd,
      );
      targetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(
        DocumentType.TARGET_BODY,
        'Message837.xsd',
        message837Xsd,
      );
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId);
      MappingSerializerService.deserialize(x12837PXslt, targetDoc, tree, paramsMap);
      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.length).toEqual(14);
      expect(links[0].sourceNodePath).toMatch('field-GS-02');
      expect(links[0].targetNodePath).toMatch('field-From');
      expect(links[1].sourceNodePath).toMatch('field-GS-03');
      expect(links[1].targetNodePath).toMatch('field-To');
      expect(links[2].sourceNodePath).toMatch('field-GS-04');
      expect(links[2].targetNodePath).toMatch('field-Date');
      expect(links[3].sourceNodePath).toMatch('field-GS-05');
      expect(links[3].targetNodePath).toMatch('field-Time');
      expect(links[4].sourceNodePath).toMatch('field-Loop2000');
      expect(links[4].targetNodePath).toMatch('for-each');
      expect(links[5].sourceNodePath).toMatch('field-CLM-01');
      expect(links[5].targetNodePath).toMatch('field-SubmitterId');
      expect(links[6].sourceNodePath).toMatch('field-CLM-02');
      expect(links[6].targetNodePath).toMatch('field-MonetaryAmount');
      expect(links[7].sourceNodePath).toMatch('field-C023-01');
      expect(links[7].targetNodePath).toMatch('field-FacilityCodeValue');
      expect(links[8].sourceNodePath).toMatch('field-C023-02');
      expect(links[8].targetNodePath).toMatch('field-FacilityCodeQualifier');
      expect(links[9].sourceNodePath).toMatch('field-C023-03');
      expect(links[9].targetNodePath).toMatch('field-ClaimFrequencyTypeCode');
      expect(links[10].sourceNodePath).toMatch('field-CLM-06');
      expect(links[10].targetNodePath).toMatch('field-YesNoConditionOrResponseCodeFile');
      expect(links[11].sourceNodePath).toMatch('field-CLM-07');
      expect(links[11].targetNodePath).toMatch('field-ProviderAcceptAssignmentCode');
      expect(links[12].sourceNodePath).toMatch('field-CLM-08');
      expect(links[12].targetNodePath).toMatch('field-YesNoConditionOrResponseCodeBenefits');
      expect(links[13].sourceNodePath).toMatch('field-CLM-09');
      expect(links[13].targetNodePath).toMatch('field-ReleaseOfInformationCode');
    });

    it('should not generate mapping link from the source body root', () => {
      sourceDoc = XmlSchemaDocumentService.createXmlSchemaDocument(
        DocumentType.SOURCE_BODY,
        'X12-850.dfdl.xsd',
        x12850DfdlXsd,
      );
      targetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(
        DocumentType.TARGET_BODY,
        'Invoice850.xsd',
        invoice850Xsd,
      );
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId);
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
  });

  describe('isInSelectedMapping()', () => {
    it('should detect selected mapping', () => {
      const { result: refOrderId } = renderHook(() =>
        useRef<NodeReference>({
          path: 'sourceBody:ShipOrder.xsd://field-ShipOrder-1234/field-OrderId-1234',
          isSource: true,
          containerRef: null,
          headerRef: null,
        }),
      );
      const { result: refShipToName } = renderHook(() =>
        useRef<NodeReference>({
          path: 'sourceBody:ShipOrder.xsd://field-ShipOrder-1234/field-ShipTo-1234/field-Name-1234',
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
    const nodeReferences: Map<string, MutableRefObject<NodeReference>> = new Map<
      string,
      MutableRefObject<NodeReference>
    >();

    const mockRect = () => ({ a: 0, b: 0 });
    const createNodeReference = (path: string) => {
      const { result } = renderHook(() =>
        useRef<NodeReference>({
          path: path,
          isSource: !path.startsWith('target'),
          containerRef: null,
          headerRef: {
            getBoundingClientRect: mockRect,
            getClientRects: mockRect,
          } as unknown as HTMLDivElement,
        }),
      );
      nodeReferences.set(path, result.current);
    };

    const getNodeReference = (path: string): MutableRefObject<NodeReference> => {
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

      const refOrderId = getNodeReference('sourceBody:ShipOrder.xsd://field-ShipOrder-1234/field-OrderId-1234');

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc, refOrderId);
      expect(links.length).toEqual(11);
      expect(links[0].sourceNodePath).toContain('field-OrderId');
      expect(links[0].targetNodePath).toContain('field-OrderId');
      expect(links[0].isSelected).toBeTruthy();
      const lineProps = MappingLinksService.calculateMappingLinkCoordinates(links, svgRef, getNodeReference);
      expect(lineProps.length).toEqual(11);
      expect(lineProps[0].sourceNodePath).not.toContain('field-OrderId');
      expect(lineProps[0].isSelected).toBeFalsy();
      expect(lineProps[10].sourceNodePath).toContain('field-OrderId');
      expect(lineProps[10].targetNodePath).toContain('field-OrderId');
      expect(lineProps[10].isSelected).toBeTruthy();
    });
  });
});
