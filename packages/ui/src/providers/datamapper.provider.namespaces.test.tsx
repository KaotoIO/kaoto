import { renderHook, waitFor } from '@testing-library/react';
import { act, useContext } from 'react';

import { useDataMapper } from '../hooks/useDataMapper';
import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
  IDocument,
} from '../models/datamapper/document';
import {
  NS_XML_SCHEMA,
  NS_XPATH_FUNCTIONS,
  NS_XSL,
  STANDARD_NAMESPACE_MAP,
} from '../models/datamapper/standard-namespaces';
import { XmlSchemaDocumentService } from '../services/document/xml-schema/xml-schema-document.service';
import {
  getAccountJsonSchema,
  getMultipleElementsXsd,
  getShipOrderToShipOrderXslt,
  getShipOrderXsd,
} from '../stubs/datamapper/data-mapper';
import { DataMapperContext, DataMapperProvider } from './datamapper.provider';

describe('DataMapperProvider - Namespaces', () => {
  describe('XPath functions namespace initialization', () => {
    it('should always have fn namespace initialized for XPath functions', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      expect(result.current.mappingTree.namespaceMap['fn']).toBe('http://www.w3.org/2005/xpath-functions');
    });

    it('should preserve fn namespace after document updates', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const docDef = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'Account', {
        Account: getAccountJsonSchema(),
      });

      const mockDocument = {
        documentType: DocumentType.PARAM,
        documentId: 'Account',
        definitionType: DocumentDefinitionType.JSON_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockDocument, docDef, 'test');
      });

      await waitFor(() => {
        expect(result.current.mappingTree.namespaceMap['fn']).toBe('http://www.w3.org/2005/xpath-functions');
      });
    });

    it('should preserve fn namespace after reset', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      act(() => {
        result.current.resetMappingTree();
      });

      await waitFor(() => {
        expect(result.current.mappingTree.namespaceMap['fn']).toBe('http://www.w3.org/2005/xpath-functions');
      });
    });
  });

  describe('Namespace synchronization', () => {
    it('STANDARD_NAMESPACE_MAP is pinned by value and initial map is a copy', () => {
      expect(STANDARD_NAMESPACE_MAP).toEqual({
        xs: NS_XML_SCHEMA,
        fn: NS_XPATH_FUNCTIONS,
        xsl: NS_XSL,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );
      const { result } = renderHook(() => useDataMapper(), { wrapper });

      expect(result.current.mappingTree.namespaceMap).toEqual(STANDARD_NAMESPACE_MAP);
      expect(result.current.mappingTree.namespaceMap).not.toBe(STANDARD_NAMESPACE_MAP);

      act(() => {
        result.current.resetMappingTree();
      });

      expect(result.current.mappingTree.namespaceMap).toEqual({
        xs: NS_XML_SCHEMA,
        fn: NS_XPATH_FUNCTIONS,
        xsl: NS_XSL,
      });
    });

    it('should merge metadata namespace map with initialXsltFile and drop clashing metadata entries', async () => {
      const mockOnUpdateNamespaceMap = vi.fn();
      const targetDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'ShipOrder.xsd': getShipOrderXsd() },
      );
      const initModel = new DocumentInitializationModel(
        {},
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID, {}),
        targetDocDef,
        {
          kept: 'http://example.com/kept',
          ns0: 'http://example.com/clash-prefix',
          tns: 'io.kaoto.datamapper.poc.test',
        },
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider
          documentInitializationModel={initModel}
          initialXsltFile={getShipOrderToShipOrderXslt()}
          onUpdateNamespaceMap={mockOnUpdateNamespaceMap}
        >
          {children}
        </DataMapperProvider>
      );

      const { result } = renderHook(() => useContext(DataMapperContext), { wrapper });

      await waitFor(() => {
        expect(result.current!.mappingTree.namespaceMap['kept']).toBe('http://example.com/kept');
        expect(result.current!.mappingTree.namespaceMap['ns0']).toBe('io.kaoto.datamapper.poc.test');
        expect(result.current!.mappingTree.namespaceMap['tns']).toBeUndefined();
      });

      expect(mockOnUpdateNamespaceMap).toHaveBeenCalled();
      const lastCallMap = mockOnUpdateNamespaceMap.mock.calls[0][0];
      expect(lastCallMap['kept']).toBe('http://example.com/kept');
      expect(lastCallMap['ns0']).toBe('io.kaoto.datamapper.poc.test');
      expect(lastCallMap['tns']).toBeUndefined();
    });

    it('should register schema-declared namespaces on initial load without initialXsltFile', async () => {
      const targetDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'MultipleElements.xsd': getMultipleElementsXsd() },
        { namespaceUri: 'io.kaoto.datamapper.test.multiple', name: 'Order' },
      );
      const initModel = new DocumentInitializationModel(
        {},
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID, {}),
        targetDocDef,
        { custom: 'http://example.com/custom', tns: 'http://example.com/override' },
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider documentInitializationModel={initModel}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useContext(DataMapperContext), { wrapper });

      await waitFor(() => {
        expect(result.current!.mappingTree.namespaceMap['custom']).toBe('http://example.com/custom');
        expect(result.current!.mappingTree.namespaceMap['tns']).toBe('http://example.com/override');
        expect(result.current!.mappingTree.namespaceMap['xs']).toBe(NS_XML_SCHEMA);
        expect(result.current!.mappingTree.namespaceMap['fn']).toBe(NS_XPATH_FUNCTIONS);
        expect(result.current!.mappingTree.namespaceMap['xsl']).toBe(NS_XSL);
      });
    });

    it('should register schema-declared namespaces on initial load with initialXsltFile', async () => {
      const targetDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'MultipleElements.xsd': getMultipleElementsXsd() },
        { namespaceUri: 'io.kaoto.datamapper.test.multiple', name: 'Order' },
      );
      const initModel = new DocumentInitializationModel(
        {},
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID, {}),
        targetDocDef,
        { custom: 'http://example.com/custom' },
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider documentInitializationModel={initModel} initialXsltFile={getShipOrderToShipOrderXslt()}>
          {children}
        </DataMapperProvider>
      );

      const { result } = renderHook(() => useContext(DataMapperContext), { wrapper });

      await waitFor(() => {
        expect(result.current!.mappingTree.namespaceMap['custom']).toBe('http://example.com/custom');
        expect(result.current!.mappingTree.namespaceMap['tns']).toBe('io.kaoto.datamapper.test.multiple');
        expect(result.current!.mappingTree.namespaceMap['ns0']).toBe('io.kaoto.datamapper.poc.test');
      });
    });

    it('should register schema namespaces when attaching a schema document via updateDocument', async () => {
      const mockOnUpdateNamespaceMap = vi.fn();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateNamespaceMap={mockOnUpdateNamespaceMap}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const docDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'MultipleElements.xsd': getMultipleElementsXsd() },
        { namespaceUri: 'io.kaoto.datamapper.test.multiple', name: 'Order' },
      );
      const xmlDoc = XmlSchemaDocumentService.createXmlSchemaDocument(docDef).document!;

      mockOnUpdateNamespaceMap.mockClear();

      act(() => {
        result.current.updateDocument(xmlDoc, docDef, BODY_DOCUMENT_ID);
      });

      await waitFor(() => {
        expect(result.current.mappingTree.namespaceMap['tns']).toBe('io.kaoto.datamapper.test.multiple');
      });

      expect(mockOnUpdateNamespaceMap).toHaveBeenCalled();
      const lastCall = mockOnUpdateNamespaceMap.mock.calls.at(-1)![0];
      expect(lastCall['tns']).toBe('io.kaoto.datamapper.test.multiple');
    });

    it('should call onUpdateNamespaceMap when refreshMappingTree is called', async () => {
      const mockOnUpdateNamespaceMap = vi.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateNamespaceMap={mockOnUpdateNamespaceMap}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      act(() => {
        result.current.refreshMappingTree();
      });

      expect(mockOnUpdateNamespaceMap).toHaveBeenCalled();
      const namespaceMap = mockOnUpdateNamespaceMap.mock.calls[0][0];
      expect(namespaceMap).toBeDefined();
      expect(namespaceMap['fn']).toBe('http://www.w3.org/2005/xpath-functions');
      expect(namespaceMap['xs']).toBe('http://www.w3.org/2001/XMLSchema');
      expect(namespaceMap['xsl']).toBe('http://www.w3.org/1999/XSL/Transform');
    });

    it('should call onUpdateNamespaceMap when resetMappingTree is called', async () => {
      const mockOnUpdateNamespaceMap = vi.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateNamespaceMap={mockOnUpdateNamespaceMap}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      act(() => {
        result.current.resetMappingTree();
      });

      expect(mockOnUpdateNamespaceMap).toHaveBeenCalled();
      const namespaceMap = mockOnUpdateNamespaceMap.mock.calls[0][0];
      expect(namespaceMap).toBeDefined();
      expect(namespaceMap['fn']).toBe('http://www.w3.org/2005/xpath-functions');
      expect(namespaceMap['xs']).toBe('http://www.w3.org/2001/XMLSchema');
      expect(namespaceMap['xsl']).toBe('http://www.w3.org/1999/XSL/Transform');
    });

    it('should re-register schema namespaces when resetMappingTree is called', async () => {
      const mockOnUpdateNamespaceMap = vi.fn();
      const targetDocDef = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, 'Body', {
        'multi.xsd': getMultipleElementsXsd(),
      });
      const documentInitializationModel = new DocumentInitializationModel({}, undefined, targetDocDef);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider
          documentInitializationModel={documentInitializationModel}
          onUpdateNamespaceMap={mockOnUpdateNamespaceMap}
        >
          {children}
        </DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      act(() => {
        result.current.resetMappingTree();
      });

      expect(mockOnUpdateNamespaceMap).toHaveBeenCalled();
      const namespaceMap = result.current.mappingTree.namespaceMap;
      expect(namespaceMap['tns']).toBe('io.kaoto.datamapper.test.multiple');
      expect(namespaceMap['xs']).toBe(NS_XML_SCHEMA);
      expect(namespaceMap['fn']).toBe(NS_XPATH_FUNCTIONS);
    });

    it('should initialize namespace map from DocumentInitializationModel on load', async () => {
      const sourceDocDef = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'Body',
        {},
      );

      const targetDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.Primitive,
        'Body',
        {},
      );

      const documentInitializationModel = new DocumentInitializationModel({}, sourceDocDef, targetDocDef);
      documentInitializationModel.namespaceMap = {
        tns: 'http://example.com/test',
        custom: 'http://example.com/custom',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider documentInitializationModel={documentInitializationModel}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useContext(DataMapperContext), { wrapper });

      await waitFor(() => {
        expect(result.current!.mappingTree.namespaceMap['tns']).toBe('http://example.com/test');
        expect(result.current!.mappingTree.namespaceMap['custom']).toBe('http://example.com/custom');
        expect(result.current!.mappingTree.namespaceMap['fn']).toBe('http://www.w3.org/2005/xpath-functions');
        expect(result.current!.mappingTree.namespaceMap['xs']).toBe('http://www.w3.org/2001/XMLSchema');
        expect(result.current!.mappingTree.namespaceMap['xsl']).toBe('http://www.w3.org/1999/XSL/Transform');
      });
    });

    it('should not call onUpdateNamespaceMap when not provided', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      expect(() => {
        act(() => {
          result.current.refreshMappingTree();
        });
      }).not.toThrow();

      expect(() => {
        act(() => {
          result.current.resetMappingTree();
        });
      }).not.toThrow();
    });
  });
});
