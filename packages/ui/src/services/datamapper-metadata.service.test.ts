import type { Mock, Mocked } from 'vitest';

import { BODY_DOCUMENT_ID, DocumentDefinition, DocumentDefinitionType, DocumentType } from '../models/datamapper';
import {
  IChoiceSelection,
  IDataMapperMetadata,
  IFieldSubstitution,
  IFieldTypeOverride,
} from '../models/datamapper/metadata';
import { FieldOverrideVariant } from '../models/datamapper/types';
import { IMetadataApi } from '../providers';
import { getCommonTypesJsonSchema, getCustomerJsonSchema, getOrderJsonSchema } from '../stubs/datamapper/data-mapper';
import { DataMapperMetadataService } from './datamapper-metadata.service';
import { JsonSchemaDocumentService } from './document/json-schema/json-schema-document.service';
import { XmlSchemaDocumentService } from './document/xml-schema/xml-schema-document.service';
import {
  GENERATED_WRAPPER_MARKER,
  GENERATED_WRAPPER_NOTICE,
} from './document/xml-schema/xml-schema-wrapper-generator.service';
import { EMPTY_XSL } from './mapping/mapping-serializer.service';

describe('DataMapperMetadataService', () => {
  let mockApi: Mocked<IMetadataApi>;

  beforeEach(() => {
    mockApi = {
      getMetadata: vi.fn(),
      setMetadata: vi.fn(),
      getResourceContent: vi.fn(),
      isResourceExist: vi.fn(),
      saveResourceContent: vi.fn(),
      deleteResource: vi.fn(),
      askUserForFileSelection: vi.fn(),
      getSuggestions: vi.fn(),
      shouldSaveSchema: false,
      onStepUpdated: vi.fn(),
    } as Mocked<IMetadataApi>;
    // A resource exists when it has content, unless a test sets its own `isResourceExist`.
    mockApi.isResourceExist.mockImplementation(async (path: string) => {
      const content = await mockApi.getResourceContent(path);
      return content !== undefined;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createMetadata', () => {
    it('should create metadata with default values when no xsltPath is provided', () => {
      const metadata = DataMapperMetadataService.createMetadata();

      expect(metadata).toEqual({
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
        xsltPath: '',
        namespaceMap: {},
      });
    });

    it('should create metadata with provided xsltPath', () => {
      const xsltPath = 'test-transform.xsl';
      const metadata = DataMapperMetadataService.createMetadata(xsltPath);

      expect(metadata).toEqual({
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
        xsltPath: 'test-transform.xsl',
        namespaceMap: {},
      });
    });
  });

  describe('cloneMetadata', () => {
    it('should clone metadata with a new xsltPath', () => {
      const originalMetadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['source.xsd'] },
        sourceParameters: {
          param1: { type: DocumentDefinitionType.Primitive, filePath: [] },
        },
        targetBody: { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['target.json'] },
        xsltPath: 'original.xsl',
      };

      const clonedMetadata = DataMapperMetadataService.cloneMetadata(originalMetadata, 'new-transform.xsl');

      expect(clonedMetadata).toEqual({
        sourceBody: originalMetadata.sourceBody,
        sourceParameters: originalMetadata.sourceParameters,
        targetBody: originalMetadata.targetBody,
        xsltPath: 'new-transform.xsl',
      });
      expect(clonedMetadata.sourceBody).toBe(originalMetadata.sourceBody);
      expect(clonedMetadata.sourceParameters).toBe(originalMetadata.sourceParameters);
      expect(clonedMetadata.targetBody).toBe(originalMetadata.targetBody);
    });
  });

  describe('duplicateXsltFile', () => {
    it('should duplicate XSLT file from original metadata to new path', async () => {
      const originalMetadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'original.xsl',
      };
      const xsltContent = '<?xml version="1.0"?><xsl:stylesheet/>';
      mockApi.getResourceContent.mockResolvedValue(xsltContent);

      await DataMapperMetadataService.duplicateXsltFile(mockApi, originalMetadata, 'new.xsl');

      expect(mockApi.getResourceContent).toHaveBeenCalledWith('original.xsl');
      expect(mockApi.saveResourceContent).toHaveBeenCalledWith('new.xsl', xsltContent);
    });

    it('should not save when original XSLT content is undefined', async () => {
      const originalMetadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'original.xsl',
      };
      mockApi.getResourceContent.mockResolvedValue(undefined);

      await DataMapperMetadataService.duplicateXsltFile(mockApi, originalMetadata, 'new.xsl');

      expect(mockApi.getResourceContent).toHaveBeenCalledWith('original.xsl');
      expect(mockApi.saveResourceContent).not.toHaveBeenCalled();
    });
  });

  describe('initializeDataMapperMetadata', () => {
    it('should initialize metadata with provided xsltPath', async () => {
      const metadata = await DataMapperMetadataService.initializeDataMapperMetadata(
        mockApi,
        'test-metadata-id',
        'existing.xsl',
      );

      expect(metadata.xsltPath).toBe('existing.xsl');
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-metadata-id', metadata);
      expect(mockApi.saveResourceContent).toHaveBeenCalledWith('existing.xsl', EMPTY_XSL);
    });

    it('should create metadata with default document definitions', async () => {
      const metadata = await DataMapperMetadataService.initializeDataMapperMetadata(
        mockApi,
        'test-metadata-id',
        'transform.xsl',
      );

      expect(metadata.sourceBody).toEqual({
        type: DocumentDefinitionType.Primitive,
        filePath: [],
        fieldTypeOverrides: [],
      });
      expect(metadata.sourceParameters).toEqual({});
      expect(metadata.targetBody).toEqual({
        type: DocumentDefinitionType.Primitive,
        filePath: [],
        fieldTypeOverrides: [],
      });
      expect(metadata.namespaceMap).toEqual({});
    });
  });

  describe('loadDocuments', () => {
    it('should load source body, target body, and parameters', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['source.xsd'] },
        sourceParameters: {
          param1: { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['param1.json'] },
        },
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['target.xsd'] },
        xsltPath: 'transform.xsl',
      };

      mockApi.getResourceContent.mockImplementation(async (path: string) => {
        if (path === 'source.xsd') return '<schema>source</schema>';
        if (path === 'target.xsd') return '<schema>target</schema>';
        if (path === 'param1.json') return '{"type":"object"}';
        return undefined;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spy = vi.spyOn(DataMapperMetadataService as any, 'doLoadDocument');

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(result.sourceBody).toBeDefined();
      expect(result.sourceBody.documentType).toBe(DocumentType.SOURCE_BODY);
      expect(result.sourceBody.name).toBe(BODY_DOCUMENT_ID);
      expect(result.targetBody).toBeDefined();
      expect(result.targetBody.documentType).toBe(DocumentType.TARGET_BODY);
      expect(result.sourceParameters['param1']).toBeDefined();
      expect(result.sourceParameters['param1'].documentType).toBe(DocumentType.PARAM);

      spy.mockRestore();
    });

    it('should load rootElementChoice when present in metadata', async () => {
      const rootElementChoice = { namespaceUri: 'http://example.com/schema', name: 'CustomRoot' };
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['source.xsd'],
          rootElementChoice,
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      mockApi.getResourceContent.mockImplementation(async (path: string) => {
        if (path === 'source.xsd') return '<schema>source</schema>';
        return undefined;
      });

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(result.sourceBody).toBeDefined();
      expect(result.sourceBody.rootElementChoice).toEqual(rootElementChoice);
    });

    it('should handle missing rootElementChoice in metadata', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['source.xsd'] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      mockApi.getResourceContent.mockImplementation(async (path: string) => {
        if (path === 'source.xsd') return '<schema>source</schema>';
        return undefined;
      });

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(result.sourceBody).toBeDefined();
      expect(result.sourceBody.rootElementChoice).toBeUndefined();
    });

    it('should restore JSON primary schema from metadata', async () => {
      const metadata: IDataMapperMetadata = {
        xsltPath: 'test.xsl',
        sourceBody: {
          type: DocumentDefinitionType.JSON_SCHEMA,
          filePath: ['Order.schema.json', 'Customer.schema.json', 'CommonTypes.schema.json'],
          rootElementChoice: { namespaceUri: '', name: 'Customer.schema.json' },
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      };

      mockApi.getResourceContent.mockImplementation((path: string) => {
        if (path === 'Order.schema.json') return Promise.resolve(getOrderJsonSchema());
        if (path === 'Customer.schema.json') return Promise.resolve(getCustomerJsonSchema());
        if (path === 'CommonTypes.schema.json') return Promise.resolve(getCommonTypesJsonSchema());
        return Promise.resolve(undefined);
      });

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(result.sourceBody.rootElementChoice).toBeDefined();
      expect(result.sourceBody.rootElementChoice?.name).toBe('Customer.schema.json');

      const docResult = JsonSchemaDocumentService.createJsonSchemaDocument(result.sourceBody);
      if (docResult.validationStatus !== 'success') {
        throw new Error(`Validation failed: ${docResult.errors?.map((e) => e.message).join('; ')}`);
      }
      const root = docResult.document!.fields[0];
      const customerId = root.fields.find((f) => f.key === 'customerId');
      expect(customerId).toBeDefined();
    });

    it('should handle metadata without rootElementChoice (backward compatibility)', async () => {
      const metadata: IDataMapperMetadata = {
        xsltPath: 'test.xsl',
        sourceBody: {
          type: DocumentDefinitionType.JSON_SCHEMA,
          filePath: ['Order.schema.json', 'Customer.schema.json', 'CommonTypes.schema.json'],
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      };

      mockApi.getResourceContent.mockImplementation((path: string) => {
        if (path === 'Order.schema.json') return Promise.resolve(getOrderJsonSchema());
        if (path === 'Customer.schema.json') return Promise.resolve(getCustomerJsonSchema());
        if (path === 'CommonTypes.schema.json') return Promise.resolve(getCommonTypesJsonSchema());
        return Promise.resolve(undefined);
      });

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(result.sourceBody.rootElementChoice).toBeUndefined();

      const docResult = JsonSchemaDocumentService.createJsonSchemaDocument(result.sourceBody);
      expect(docResult.validationStatus).toBe('success');
    });

    it('should handle empty source parameters', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(result.sourceBody).toBeDefined();
      expect(result.targetBody).toBeDefined();
      expect(Object.keys(result.sourceParameters)).toHaveLength(0);
    });

    it('should load entrySchemaFile from metadata when present', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['Main.xsd', 'Types.xsd'],
          entrySchemaFile: 'Main.xsd',
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      mockApi.getResourceContent.mockImplementation(async (path) => `<schema file="${path}"/>`);

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(result.sourceBody.entrySchemaFile).toBe('Main.xsd');
    });

    it('should leave entrySchemaFile undefined for legacy metadata so createXmlSchemaDocument infers it', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['Types.xsd', 'Main.xsd'],
          rootElementChoice: { namespaceUri: 'http://example.com/main', name: 'Root' },
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      mockApi.getResourceContent.mockImplementation(async (path) => {
        if (path === 'Main.xsd') {
          return '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/main"><xs:element name="Root"/></xs:schema>';
        }
        return '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/types"><xs:element name="Other"/></xs:schema>';
      });

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(result.sourceBody.entrySchemaFile).toBeUndefined();
      expect(result.sourceBody.rootElementChoice).toEqual({ namespaceUri: 'http://example.com/main', name: 'Root' });
    });

    it('should keep definitionFiles in filePath order for legacy metadata without rootElementChoice', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['First.xsd', 'Second.xsd'],
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      mockApi.getResourceContent.mockImplementation(async (path) => `<schema file="${path}"/>`);

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(result.sourceBody.entrySchemaFile).toBeUndefined();
      expect(Object.keys(result.sourceBody.definitionFiles ?? {})).toEqual(['First.xsd', 'Second.xsd']);
    });

    it('should successfully construct and populate XmlSchemaDocument from legacy metadata without entrySchemaFile', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['CommonTypes.xsd', 'Main.xsd'],
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      mockApi.getResourceContent.mockImplementation(async (path) => {
        if (path === 'Main.xsd') {
          return `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/ns" xmlns="http://example.com/ns">
  <xs:include schemaLocation="CommonTypes.xsd"/>
  <xs:element name="Order">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="Id" type="xs:string"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
        }
        return `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/ns" xmlns="http://example.com/ns">
  <xs:complexType name="ItemType">
    <xs:sequence>
      <xs:element name="Name" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      });

      const loaded = await DataMapperMetadataService.loadDocuments(mockApi, metadata);
      expect(loaded.sourceBody.entrySchemaFile).toBeUndefined();

      const docResult = XmlSchemaDocumentService.createXmlSchemaDocument(loaded.sourceBody);
      expect(docResult.validationStatus).toBe('success');
      expect(docResult.documentDefinition?.entrySchemaFile).toBe('Main.xsd');
      expect(docResult.document?.rootElement?.getName()).toBe('Order');
      expect(docResult.document?.fields[0].name).toBe('Order');
      expect(docResult.document?.fields[0].fields[0].name).toBe('Id');
    });

    it('should pin deterministic entry root selection for legacy multi-file import without rootElementChoice', async () => {
      // Main.xsd imports Types.xsd (both declare elements, no entrySchemaFile/rootElementChoice in legacy metadata).
      // Unreferenced assembly root Main.xsd is inferred as entrySchemaFile, and Main.xsd's root element is selected.
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['Types.xsd', 'Main.xsd'],
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      mockApi.getResourceContent.mockImplementation(async (path) => {
        if (path === 'Main.xsd') {
          return `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/main" xmlns:types="http://example.com/types">
  <xs:import namespace="http://example.com/types" schemaLocation="Types.xsd"/>
  <xs:element name="MainOrder" type="xs:string"/>
</xs:schema>`;
        }
        return `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/types">
  <xs:element name="TypeItem" type="xs:string"/>
</xs:schema>`;
      });

      const loaded = await DataMapperMetadataService.loadDocuments(mockApi, metadata);
      expect(loaded.sourceBody.entrySchemaFile).toBeUndefined();

      const docResult = XmlSchemaDocumentService.createXmlSchemaDocument(loaded.sourceBody);
      expect(docResult.validationStatus).toBe('success');
      expect(docResult.documentDefinition?.entrySchemaFile).toBe('Main.xsd');
      expect(docResult.document?.rootElement?.getName()).toBe('MainOrder');
    });

    it('should handle file read errors gracefully', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['nonexistent.xsd'] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      mockApi.getResourceContent.mockRejectedValue(new Error('File not found'));
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(result.sourceBody).toBeDefined();
      expect(result.targetBody).toBeDefined();
      expect(consoleLogSpy).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });

  describe('loadMappingFile', () => {
    it('should load XSLT mapping file content', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const xsltContent = '<?xml version="1.0"?><xsl:stylesheet/>';
      mockApi.getResourceContent.mockResolvedValue(xsltContent);

      const result = await DataMapperMetadataService.loadMappingFile(mockApi, metadata);

      expect(result).toBe(xsltContent);
      expect(mockApi.getResourceContent).toHaveBeenCalledWith('transform.xsl');
    });

    it('should return undefined when file does not exist', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'nonexistent.xsl',
      };
      mockApi.getResourceContent.mockResolvedValue(undefined);

      const result = await DataMapperMetadataService.loadMappingFile(mockApi, metadata);

      expect(result).toBeUndefined();
    });
  });

  describe('updateSourceBodyMetadata', () => {
    it('should update source body metadata and save it', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'source.xsd': '<schema/>' },
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(metadata.sourceBody.type).toBe(DocumentDefinitionType.XML_SCHEMA);
      expect(metadata.sourceBody.filePath).toEqual(['source.xsd']);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should handle empty definition files', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.Primitive,
        BODY_DOCUMENT_ID,
        undefined,
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(metadata.sourceBody.type).toBe(DocumentDefinitionType.Primitive);
      expect(metadata.sourceBody.filePath).toEqual([]);
    });

    it('should persist rootElementChoice when provided', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const rootElementChoice = { namespaceUri: 'http://example.com/schema', name: 'CustomRoot' };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'source.xsd': '<schema/>' },
        rootElementChoice,
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(metadata.sourceBody.type).toBe(DocumentDefinitionType.XML_SCHEMA);
      expect(metadata.sourceBody.filePath).toEqual(['source.xsd']);
      expect(metadata.sourceBody.rootElementChoice).toEqual(rootElementChoice);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should not persist the display-only declaringFile of rootElementChoice', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'main.xsd': '<schema/>' },
        { namespaceUri: 'urn:ns', name: 'Root', entrySchemaFile: 'main.xsd', declaringFile: 'types.xsd' },
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(metadata.sourceBody.rootElementChoice).toEqual({
        namespaceUri: 'urn:ns',
        name: 'Root',
        entrySchemaFile: 'main.xsd',
      });
      expect(metadata.sourceBody.rootElementChoice).not.toHaveProperty('declaringFile');
    });

    it('should not persist rootElementChoice when not provided', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'source.xsd': '<schema/>' },
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(metadata.sourceBody.type).toBe(DocumentDefinitionType.XML_SCHEMA);
      expect(metadata.sourceBody.rootElementChoice).toBeUndefined();
    });

    it('should persist JSON primary schema to metadata via rootElementChoice', async () => {
      const metadata = DataMapperMetadataService.createMetadata('test.xsl');

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'Order.schema.json': getOrderJsonSchema(),
          'Customer.schema.json': getCustomerJsonSchema(),
          'CommonTypes.schema.json': getCommonTypesJsonSchema(),
        },
        { namespaceUri: '', name: 'Customer.schema.json' },
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(metadata.sourceBody.rootElementChoice).toBeDefined();
      expect(metadata.sourceBody.rootElementChoice?.name).toBe('Customer.schema.json');
    });

    it('should persist fieldTypeOverrides from DocumentDefinition', async () => {
      const metadata = DataMapperMetadataService.createMetadata('test.xsl');
      const fieldTypeOverrides: IFieldTypeOverride[] = [
        {
          schemaPath: '/ns0:Root/Field1',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: FieldOverrideVariant.SAFE,
        },
      ];
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'source.xsd': '<schema/>' },
        undefined,
        fieldTypeOverrides,
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(metadata.sourceBody.fieldTypeOverrides).toEqual(fieldTypeOverrides);
    });

    it('should persist choiceSelections from DocumentDefinition', async () => {
      const metadata = DataMapperMetadataService.createMetadata('test.xsl');
      const choiceSelections: IChoiceSelection[] = [{ schemaPath: '/ns0:Root/{choice:0}', selectedMemberIndex: 1 }];
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'source.xsd': '<schema/>' },
        undefined,
        undefined,
        choiceSelections,
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(metadata.sourceBody.choiceSelections).toEqual(choiceSelections);
    });

    it('should persist undefined fieldTypeOverrides when not set on DocumentDefinition', async () => {
      const metadata = DataMapperMetadataService.createMetadata('test.xsl');
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'source.xsd': '<schema/>' },
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(metadata.sourceBody.fieldTypeOverrides).toBeUndefined();
    });

    it('should persist fieldSubstitutions from DocumentDefinition', async () => {
      const metadata = DataMapperMetadataService.createMetadata('test.xsl');
      const fieldSubstitutions: IFieldSubstitution[] = [
        {
          schemaPath: '/ns0:Root/ns0:Message',
          name: 'ns0:AlrtMetaDtaReq',
          originalName: 'ns0:Message',
        },
      ];
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'source.xsd': '<schema/>' },
        undefined,
        undefined,
        undefined,
        fieldSubstitutions,
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(metadata.sourceBody.fieldSubstitutions).toEqual(fieldSubstitutions);
    });

    it('should persist entrySchemaFile from DocumentDefinition to metadata', async () => {
      const metadata = DataMapperMetadataService.createMetadata('test.xsl');
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'Main.xsd': '<schema/>', 'Sub.xsd': '<schema/>' },
        undefined,
        undefined,
        undefined,
        undefined,
        'Main.xsd',
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(metadata.sourceBody.entrySchemaFile).toBe('Main.xsd');
    });
  });

  describe('updateTargetBodyMetadata', () => {
    it('should update target body metadata and save it', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const definition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'target.json': '{}' },
      );

      await DataMapperMetadataService.updateTargetBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(metadata.targetBody.type).toBe(DocumentDefinitionType.JSON_SCHEMA);
      expect(metadata.targetBody.filePath).toEqual(['target.json']);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should persist fieldTypeOverrides and choiceSelections from DocumentDefinition', async () => {
      const metadata = DataMapperMetadataService.createMetadata('test.xsl');
      const fieldTypeOverrides: IFieldTypeOverride[] = [
        {
          schemaPath: '/ns1:Order/ShipTo',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: FieldOverrideVariant.FORCE,
        },
      ];
      const choiceSelections: IChoiceSelection[] = [{ schemaPath: '/ns1:Order/{choice:0}', selectedMemberIndex: 0 }];
      const definition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'target.xsd': '<schema/>' },
        undefined,
        fieldTypeOverrides,
        choiceSelections,
      );

      await DataMapperMetadataService.updateTargetBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(metadata.targetBody.fieldTypeOverrides).toEqual(fieldTypeOverrides);
      expect(metadata.targetBody.choiceSelections).toEqual(choiceSelections);
    });
  });

  describe('updateSourceParameterMetadata', () => {
    it('should add new source parameter metadata', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const definition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.XML_SCHEMA, 'param1', {
        'param1.xsd': '<schema/>',
      });

      await DataMapperMetadataService.updateSourceParameterMetadata(mockApi, 'test-id', metadata, 'param1', definition);

      expect(metadata.sourceParameters['param1']).toBeDefined();
      expect(metadata.sourceParameters['param1'].type).toBe(DocumentDefinitionType.XML_SCHEMA);
      expect(metadata.sourceParameters['param1'].filePath).toEqual(['param1.xsd']);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should update existing source parameter metadata', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {
          param1: { type: DocumentDefinitionType.Primitive, filePath: [] },
        },
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const definition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'param1', {
        'param1.json': '{}',
      });

      await DataMapperMetadataService.updateSourceParameterMetadata(mockApi, 'test-id', metadata, 'param1', definition);

      expect(metadata.sourceParameters['param1'].type).toBe(DocumentDefinitionType.JSON_SCHEMA);
      expect(metadata.sourceParameters['param1'].filePath).toEqual(['param1.json']);
    });

    it('should persist fieldTypeOverrides and choiceSelections from DocumentDefinition', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const fieldTypeOverrides: IFieldTypeOverride[] = [
        {
          schemaPath: '/ns0:Config/Setting',
          type: 'xs:string',
          originalType: 'xs:anyType',
          variant: FieldOverrideVariant.SAFE,
        },
      ];
      const choiceSelections: IChoiceSelection[] = [{ schemaPath: '/ns0:Config/{choice:0}', selectedMemberIndex: 1 }];
      const definition = new DocumentDefinition(
        DocumentType.PARAM,
        DocumentDefinitionType.XML_SCHEMA,
        'param1',
        { 'param1.xsd': '<schema/>' },
        undefined,
        fieldTypeOverrides,
        choiceSelections,
      );

      await DataMapperMetadataService.updateSourceParameterMetadata(mockApi, 'test-id', metadata, 'param1', definition);

      expect(metadata.sourceParameters['param1'].fieldTypeOverrides).toEqual(fieldTypeOverrides);
      expect(metadata.sourceParameters['param1'].choiceSelections).toEqual(choiceSelections);
    });
  });

  describe('deleteSourceParameterMetadata', () => {
    it('should delete source parameter metadata', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {
          param1: { type: DocumentDefinitionType.Primitive, filePath: [] },
          param2: { type: DocumentDefinitionType.Primitive, filePath: [] },
        },
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      await DataMapperMetadataService.deleteSourceParameterMetadata(mockApi, 'test-id', metadata, 'param1');

      expect(metadata.sourceParameters['param1']).toBeUndefined();
      expect(metadata.sourceParameters['param2']).toBeDefined();
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should handle deleting non-existent parameter gracefully', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      await DataMapperMetadataService.deleteSourceParameterMetadata(mockApi, 'test-id', metadata, 'nonexistent');

      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });
  });

  describe('renameSourceParameterMetadata', () => {
    it('should rename source parameter metadata', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {
          oldParam: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['old.xsd'] },
          otherParam: { type: DocumentDefinitionType.Primitive, filePath: [] },
        },
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      await DataMapperMetadataService.renameSourceParameterMetadata(
        mockApi,
        'test-id',
        metadata,
        'oldParam',
        'newParam',
      );

      expect(metadata.sourceParameters['oldParam']).toBeUndefined();
      expect(metadata.sourceParameters['newParam']).toBeDefined();
      expect(metadata.sourceParameters['newParam'].type).toBe(DocumentDefinitionType.XML_SCHEMA);
      expect(metadata.sourceParameters['newParam'].filePath).toEqual(['old.xsd']);
      expect(metadata.sourceParameters['otherParam']).toBeDefined();
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should preserve order when renaming parameter', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {
          param1: { type: DocumentDefinitionType.Primitive, filePath: [] },
          param2: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['param2.xsd'] },
          param3: { type: DocumentDefinitionType.Primitive, filePath: [] },
        },
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      await DataMapperMetadataService.renameSourceParameterMetadata(
        mockApi,
        'test-id',
        metadata,
        'param2',
        'renamedParam',
      );

      const keys = Object.keys(metadata.sourceParameters);
      expect(keys).toEqual(['param1', 'param3', 'renamedParam']);
    });
  });

  describe('updateMappingFile', () => {
    it('should save XSLT mapping file content', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const xsltContent = '<?xml version="1.0"?><xsl:stylesheet/>';

      await DataMapperMetadataService.updateMappingFile(mockApi, metadata, xsltContent);

      expect(mockApi.saveResourceContent).toHaveBeenCalledWith('transform.xsl', xsltContent);
    });
  });

  describe('selectDocumentSchema', () => {
    it('should prompt user for file selection', async () => {
      const selectedFile = 'schemas/document.xsd';
      mockApi.askUserForFileSelection.mockResolvedValue(selectedFile);

      const result = await DataMapperMetadataService.selectDocumentSchema(mockApi, '**/*.xsd');

      expect(mockApi.askUserForFileSelection).toHaveBeenCalledWith('**/*.xsd', undefined, {
        canPickMany: true,
        placeHolder: 'Choose schema file(s) to attach. You can upload more files later to resolve dependencies.',
        title: 'Attaching document schema file(s)',
      });
      expect(result).toBe(selectedFile);
    });

    it('should return undefined when user cancels selection', async () => {
      mockApi.askUserForFileSelection.mockResolvedValue(undefined);

      const result = await DataMapperMetadataService.selectDocumentSchema(mockApi, '**/*.xsd');

      expect(result).toBeUndefined();
    });
  });

  describe('deleteMetadata', () => {
    const GENERATED_WRAPPER = `<!-- ${GENERATED_WRAPPER_MARKER} for transform.xsl. ${GENERATED_WRAPPER_NOTICE}; it is regenerated. -->`;
    const metadataWithXslt = {
      sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      xsltPath: 'transform.xsl',
    } as IDataMapperMetadata;

    it('should delete metadata by setting it to undefined', async () => {
      await DataMapperMetadataService.deleteMetadata(mockApi, 'test-id');

      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', undefined);
    });

    it('should delete the generated validation wrapper before clearing the metadata', async () => {
      mockApi.getMetadata.mockResolvedValue(metadataWithXslt);
      mockApi.getResourceContent.mockResolvedValue(GENERATED_WRAPPER);
      const order: string[] = [];
      mockApi.deleteResource.mockImplementation(async () => {
        order.push('deleteResource');
        return true;
      });
      mockApi.setMetadata.mockImplementation(async () => {
        order.push('setMetadata');
      });

      await DataMapperMetadataService.deleteMetadata(mockApi, 'test-id');

      expect(mockApi.getResourceContent).toHaveBeenCalledWith('transform-validation-wrapper.xsd');
      expect(mockApi.deleteResource).toHaveBeenCalledWith('transform-validation-wrapper.xsd');
      expect(order).toEqual(['deleteResource', 'setMetadata']);
    });

    it('should not delete a user file that happens to share the wrapper name', async () => {
      mockApi.getMetadata.mockResolvedValue(metadataWithXslt);
      mockApi.getResourceContent.mockResolvedValue('<xs:schema/>');

      await DataMapperMetadataService.deleteMetadata(mockApi, 'test-id');

      expect(mockApi.deleteResource).not.toHaveBeenCalled();
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', undefined);
    });

    it('should still clear the metadata when the wrapper cannot be deleted', async () => {
      mockApi.getMetadata.mockResolvedValue(metadataWithXslt);
      mockApi.getResourceContent.mockResolvedValue(GENERATED_WRAPPER);
      mockApi.deleteResource.mockRejectedValue(new Error('boom'));
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      await DataMapperMetadataService.deleteMetadata(mockApi, 'test-id');

      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', undefined);
    });

    it('should still clear the metadata when the metadata cannot be read', async () => {
      mockApi.getMetadata.mockRejectedValue(new Error('boom'));
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      await DataMapperMetadataService.deleteMetadata(mockApi, 'test-id');

      expect(mockApi.deleteResource).not.toHaveBeenCalled();
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', undefined);
    });
  });

  describe('validation wrapper', () => {
    const GENERATED_WRAPPER = `<!-- ${GENERATED_WRAPPER_MARKER} for a.xsl. ${GENERATED_WRAPPER_NOTICE}; it is regenerated. -->`;

    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    describe('saveValidationWrapper', () => {
      it('should save the wrapper next to the XSLT file', async () => {
        const saved = await DataMapperMetadataService.saveValidationWrapper(mockApi, 'dir/a.xsl', '<xs:schema/>');

        expect(saved).toBeUndefined();
        expect(mockApi.saveResourceContent).toHaveBeenCalledWith('dir/a-validation-wrapper.xsd', '<xs:schema/>');
      });

      it('should overwrite an existing generated wrapper', async () => {
        mockApi.getResourceContent.mockResolvedValue(GENERATED_WRAPPER);

        const saved = await DataMapperMetadataService.saveValidationWrapper(mockApi, 'a.xsl', '<xs:schema/>');

        expect(saved).toBeUndefined();
        expect(mockApi.saveResourceContent).toHaveBeenCalledWith('a-validation-wrapper.xsd', '<xs:schema/>');
      });

      it('should not write an unchanged wrapper again', async () => {
        mockApi.getResourceContent.mockResolvedValue(`${GENERATED_WRAPPER}<xs:schema/>`);

        const saved = await DataMapperMetadataService.saveValidationWrapper(
          mockApi,
          'a.xsl',
          `${GENERATED_WRAPPER}<xs:schema/>`,
        );

        expect(saved).toBeUndefined();
        expect(mockApi.saveResourceContent).not.toHaveBeenCalled();
      });

      it('should write only the aggregator that changed and keep the unchanged wrapper', async () => {
        const wrapper = `${GENERATED_WRAPPER}<xs:import schemaLocation="a-validation-wrapper-1.xsd"/>`;
        const files: Record<string, string> = {
          'a-validation-wrapper.xsd': wrapper,
          'a-validation-wrapper-1.xsd': `${GENERATED_WRAPPER}<old/>`,
        };
        mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(files[path]));

        await DataMapperMetadataService.saveValidationWrapper(mockApi, 'a.xsl', wrapper, {
          'a-validation-wrapper-1.xsd': `${GENERATED_WRAPPER}<old/>`,
        });
        expect(mockApi.saveResourceContent).not.toHaveBeenCalled();

        await DataMapperMetadataService.saveValidationWrapper(mockApi, 'a.xsl', wrapper, {
          'a-validation-wrapper-1.xsd': `${GENERATED_WRAPPER}<new/>`,
        });
        expect(mockApi.saveResourceContent.mock.calls).toEqual([
          ['a-validation-wrapper-1.xsd', `${GENERATED_WRAPPER}<new/>`],
        ]);
      });

      it('should not overwrite a user file that has the wrapper name', async () => {
        mockApi.getResourceContent.mockResolvedValue('<xs:schema>user</xs:schema>');

        const saved = await DataMapperMetadataService.saveValidationWrapper(mockApi, 'a.xsl', '<xs:schema/>');

        expect(saved).toContain('a-validation-wrapper.xsd');
        expect(mockApi.saveResourceContent).not.toHaveBeenCalled();
      });

      it('should save the aggregators before the wrapper and remove stale ones', async () => {
        const files: Record<string, string> = {
          'a-validation-wrapper.xsd': `${GENERATED_WRAPPER}<xs:import schemaLocation="a-validation-wrapper-2.xsd"/>`,
          'a-validation-wrapper-2.xsd': GENERATED_WRAPPER,
        };
        mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(files[path]));

        const saved = await DataMapperMetadataService.saveValidationWrapper(mockApi, 'a.xsl', '<xs:schema/>', {
          'a-validation-wrapper-1.xsd': '<agg/>',
        });

        expect(saved).toBeUndefined();
        expect(mockApi.saveResourceContent.mock.calls.map(([path]) => path)).toEqual([
          'a-validation-wrapper-1.xsd',
          'a-validation-wrapper.xsd',
        ]);
        expect(mockApi.deleteResource).toHaveBeenCalledWith('a-validation-wrapper-2.xsd');
      });

      it('should not overwrite a user file with an aggregator name', async () => {
        mockApi.getResourceContent.mockImplementation((path: string) =>
          Promise.resolve(path === 'a-validation-wrapper-1.xsd' ? '<xs:schema>user</xs:schema>' : undefined),
        );

        const saved = await DataMapperMetadataService.saveValidationWrapper(mockApi, 'a.xsl', '<xs:schema/>', {
          'a-validation-wrapper-1.xsd': '<agg/>',
        });

        expect(saved).toContain('a-validation-wrapper-1.xsd');
        expect(mockApi.saveResourceContent).not.toHaveBeenCalled();
      });

      it('should return the reason when saving fails', async () => {
        mockApi.saveResourceContent.mockRejectedValue(new Error('boom'));

        const saved = await DataMapperMetadataService.saveValidationWrapper(mockApi, 'a.xsl', '<xs:schema/>');

        expect(saved).toBe('Error: boom');
      });

      it('should never write to the XSLT path itself', async () => {
        await DataMapperMetadataService.saveValidationWrapper(mockApi, 'a.xslt', '<xs:schema/>');

        expect(mockApi.saveResourceContent).toHaveBeenCalledWith('a.xslt-validation-wrapper.xsd', '<xs:schema/>');
      });
    });

    describe('getTargetBodyType', () => {
      it.each([
        [undefined, DocumentDefinitionType.Primitive],
        [{ targetBody: undefined }, DocumentDefinitionType.Primitive],
        [{ targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] } }, DocumentDefinitionType.Primitive],
        [
          { targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['a.xsd'] } },
          DocumentDefinitionType.XML_SCHEMA,
        ],
        [
          { targetBody: { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['a.json'] } },
          DocumentDefinitionType.JSON_SCHEMA,
        ],
      ])('should resolve %j to %s', async (metadata, expected) => {
        mockApi.getMetadata.mockResolvedValue(metadata);

        expect(await DataMapperMetadataService.getTargetBodyType(mockApi, 'id')).toBe(expected);
        expect(mockApi.getMetadata).toHaveBeenCalledWith('id');
      });
    });

    describe('duplicateValidationWrapper', () => {
      it('should copy a generated wrapper and report the moved file', async () => {
        mockApi.getResourceContent.mockResolvedValue(GENERATED_WRAPPER);

        const result = await DataMapperMetadataService.duplicateValidationWrapper(mockApi, 'a.xsl', 'b.xsl');

        expect(result).toEqual({ renames: { 'a-validation-wrapper.xsd': 'b-validation-wrapper.xsd' } });
        expect(mockApi.saveResourceContent).toHaveBeenCalledWith('b-validation-wrapper.xsd', GENERATED_WRAPPER);
      });

      it('should copy the aggregators and rewrite their references', async () => {
        const wrapper = `${GENERATED_WRAPPER}<xs:import namespace="urn:x" schemaLocation="a-validation-wrapper-1.xsd"/>`;
        const files: Record<string, string> = {
          'dir/a-validation-wrapper.xsd': wrapper,
          'dir/a-validation-wrapper-1.xsd': `${GENERATED_WRAPPER}<xs:include schemaLocation="x.xsd"/>`,
        };
        mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(files[path]));

        const { renames, failure } = await DataMapperMetadataService.duplicateValidationWrapper(
          mockApi,
          'dir/a.xsl',
          'dir/b.xsl',
        );

        expect(failure).toBeUndefined();
        expect(renames).toEqual({
          'dir/a-validation-wrapper.xsd': 'dir/b-validation-wrapper.xsd',
          'dir/a-validation-wrapper-1.xsd': 'dir/b-validation-wrapper-1.xsd',
        });
        expect(mockApi.saveResourceContent).toHaveBeenCalledWith(
          'dir/b-validation-wrapper.xsd',
          expect.stringContaining('schemaLocation="b-validation-wrapper-1.xsd"'),
        );
        expect(mockApi.saveResourceContent).toHaveBeenCalledWith(
          'dir/b-validation-wrapper-1.xsd',
          files['dir/a-validation-wrapper-1.xsd'],
        );
        // the wrapper is written last
        expect(mockApi.saveResourceContent.mock.calls.at(-1)?.[0]).toBe('dir/b-validation-wrapper.xsd');
      });

      it('should copy nothing when an aggregator is missing', async () => {
        const files: Record<string, string> = {
          'a-validation-wrapper.xsd': `${GENERATED_WRAPPER}<xs:import schemaLocation="a-validation-wrapper-1.xsd"/>`,
        };
        mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(files[path]));

        const result = await DataMapperMetadataService.duplicateValidationWrapper(mockApi, 'a.xsl', 'b.xsl');

        expect(result.renames).toEqual({});
        expect(result.failure).toContain('a-validation-wrapper-1.xsd');
        expect(mockApi.saveResourceContent).not.toHaveBeenCalled();
      });

      it('should not read a wrapper that does not exist (no editor error notification)', async () => {
        mockApi.isResourceExist.mockResolvedValue(false);

        const result = await DataMapperMetadataService.duplicateValidationWrapper(mockApi, 'a.xsl', 'b.xsl');

        expect(result).toEqual({ renames: {} });
        expect(mockApi.getResourceContent).not.toHaveBeenCalled();
      });

      it('should not copy a user file with the same name, and not report it as a failure', async () => {
        mockApi.getResourceContent.mockResolvedValue('<xs:schema/>');

        expect(await DataMapperMetadataService.duplicateValidationWrapper(mockApi, 'a.xsl', 'b.xsl')).toEqual({
          renames: {},
        });
        expect(mockApi.saveResourceContent).not.toHaveBeenCalled();
      });

      it('should not overwrite a user file at the target wrapper path', async () => {
        mockApi.getResourceContent.mockImplementation((path: string) =>
          Promise.resolve(path === 'a-validation-wrapper.xsd' ? GENERATED_WRAPPER : '<xs:schema/>'),
        );

        const result = await DataMapperMetadataService.duplicateValidationWrapper(mockApi, 'a.xsl', 'b.xsl');

        expect(result.renames).toEqual({});
        expect(result.failure).toContain('b-validation-wrapper.xsd');
        expect(mockApi.saveResourceContent).not.toHaveBeenCalled();
      });

      describe('when a write fails half way', () => {
        let files: Record<string, string>;

        beforeEach(() => {
          files = {
            'a-validation-wrapper.xsd': `${GENERATED_WRAPPER}<xs:import schemaLocation="a-validation-wrapper-1.xsd"/><xs:import schemaLocation="a-validation-wrapper-2.xsd"/>`,
            'a-validation-wrapper-1.xsd': `${GENERATED_WRAPPER}<one/>`,
            'a-validation-wrapper-2.xsd': `${GENERATED_WRAPPER}<two/>`,
          };
          mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(files[path]));
          mockApi.saveResourceContent.mockImplementation((path: string, content: string) => {
            files[path] = content;
            return Promise.resolve();
          });
          mockApi.deleteResource.mockImplementation((path: string) => {
            delete files[path];
            return Promise.resolve(true);
          });
        });

        it('should remove the written aggregators when only the wrapper write is rejected', async () => {
          mockApi.saveResourceContent.mockImplementation((path: string, content: string) => {
            if (path === 'b-validation-wrapper.xsd') return Promise.reject(new Error('disk full'));
            files[path] = content;
            return Promise.resolve();
          });

          const result = await DataMapperMetadataService.duplicateValidationWrapper(mockApi, 'a.xsl', 'b.xsl');

          expect(result).toEqual({ renames: {}, failure: 'Error: disk full' });
          expect(Object.keys(files).sort()).toEqual([
            'a-validation-wrapper-1.xsd',
            'a-validation-wrapper-2.xsd',
            'a-validation-wrapper.xsd',
          ]);
        });

        it('should not write the wrapper, and remove the aggregators that were written, when one aggregator is rejected', async () => {
          mockApi.saveResourceContent.mockImplementation((path: string, content: string) => {
            if (path === 'b-validation-wrapper-2.xsd') return Promise.reject(new Error('disk full'));
            files[path] = content;
            return Promise.resolve();
          });

          const result = await DataMapperMetadataService.duplicateValidationWrapper(mockApi, 'a.xsl', 'b.xsl');

          expect(result).toEqual({ renames: {}, failure: 'Error: disk full' });
          expect(files['b-validation-wrapper.xsd']).toBeUndefined();
          expect(files['b-validation-wrapper-1.xsd']).toBeUndefined();
          expect(mockApi.saveResourceContent).not.toHaveBeenCalledWith('b-validation-wrapper.xsd', expect.anything());
        });
      });

      it('should report a failure when writing fails', async () => {
        mockApi.getResourceContent.mockResolvedValue(GENERATED_WRAPPER);
        mockApi.saveResourceContent.mockRejectedValue(new Error('boom'));

        expect(await DataMapperMetadataService.duplicateValidationWrapper(mockApi, 'a.xsl', 'b.xsl')).toEqual({
          renames: {},
          failure: 'Error: boom',
        });
      });

      it('should report a failure when reading the old wrapper fails', async () => {
        mockApi.getResourceContent.mockRejectedValue(new Error('unreadable'));

        expect(await DataMapperMetadataService.duplicateValidationWrapper(mockApi, 'a.xsl', 'b.xsl')).toEqual({
          renames: {},
          failure: 'Error: unreadable',
        });
        expect(mockApi.saveResourceContent).not.toHaveBeenCalled();
      });

      it('should return nothing for empty paths', async () => {
        expect(await DataMapperMetadataService.duplicateValidationWrapper(mockApi, '', 'b.xsl')).toEqual({
          renames: {},
        });
        expect(await DataMapperMetadataService.duplicateValidationWrapper(mockApi, 'a.xsl', '')).toEqual({
          renames: {},
        });
        expect(mockApi.getResourceContent).not.toHaveBeenCalled();
      });
    });

    describe('deleteValidationWrapper', () => {
      it('should delete a generated wrapper', async () => {
        mockApi.getResourceContent.mockResolvedValue(GENERATED_WRAPPER);

        await DataMapperMetadataService.deleteValidationWrapper(mockApi, 'a.xsl');

        expect(mockApi.deleteResource).toHaveBeenCalledWith('a-validation-wrapper.xsd');
      });

      it('should delete the aggregators of the wrapper too', async () => {
        const files: Record<string, string> = {
          'a-validation-wrapper.xsd': `${GENERATED_WRAPPER}<xs:import schemaLocation="a-validation-wrapper-1.xsd"/>`,
          'a-validation-wrapper-1.xsd': GENERATED_WRAPPER,
        };
        mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(files[path]));

        await DataMapperMetadataService.deleteValidationWrapper(mockApi, 'a.xsl');

        expect(mockApi.deleteResource).toHaveBeenCalledWith('a-validation-wrapper-1.xsd');
        expect(mockApi.deleteResource).toHaveBeenCalledWith('a-validation-wrapper.xsd');
      });

      it('should not touch a wrapper that does not exist (no editor error notification)', async () => {
        mockApi.isResourceExist.mockResolvedValue(false);

        await DataMapperMetadataService.deleteValidationWrapper(mockApi, 'a.xsl');

        expect(mockApi.getResourceContent).not.toHaveBeenCalled();
        expect(mockApi.deleteResource).not.toHaveBeenCalled();
      });

      it('should not delete a user file', async () => {
        mockApi.getResourceContent.mockResolvedValue('<xs:schema/>');

        await DataMapperMetadataService.deleteValidationWrapper(mockApi, 'a.xsl');

        expect(mockApi.deleteResource).not.toHaveBeenCalled();
      });

      it('should not throw when the API fails', async () => {
        mockApi.getResourceContent.mockRejectedValue(new Error('boom'));

        await expect(DataMapperMetadataService.deleteValidationWrapper(mockApi, 'a.xsl')).resolves.toBeUndefined();
      });

      it('should not throw when deleting the wrapper is rejected', async () => {
        mockApi.getResourceContent.mockResolvedValue(GENERATED_WRAPPER);
        mockApi.deleteResource.mockRejectedValue(new Error('read-only'));
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await expect(DataMapperMetadataService.deleteValidationWrapper(mockApi, 'a.xsl')).resolves.toBeUndefined();

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('read-only'));
      });

      it('should do nothing for an empty xslt path', async () => {
        await DataMapperMetadataService.deleteValidationWrapper(mockApi, '');

        expect(mockApi.isResourceExist).not.toHaveBeenCalled();
      });
    });

    describe('duplicateMetadataFiles', () => {
      const original = { xsltPath: 'a.xsl' } as IDataMapperMetadata;

      it('should report the XSLT file and the wrapper', async () => {
        const files: Record<string, string> = { 'a.xsl': '<xsl/>', 'a-validation-wrapper.xsd': GENERATED_WRAPPER };
        mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(files[path]));

        const renames = await DataMapperMetadataService.duplicateMetadataFiles(mockApi, original, 'b.xsl');

        expect(renames).toEqual({ 'a.xsl': 'b.xsl', 'a-validation-wrapper.xsd': 'b-validation-wrapper.xsd' });
        expect(mockApi.saveResourceContent).toHaveBeenCalledWith('b.xsl', '<xsl/>');
      });

      it('should warn with the reason when the wrapper exists but could not be copied', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const files: Record<string, string> = { 'a.xsl': '<xsl/>', 'a-validation-wrapper.xsd': GENERATED_WRAPPER };
        mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(files[path]));
        mockApi.saveResourceContent.mockImplementation((path: string) =>
          path === 'b-validation-wrapper.xsd' ? Promise.reject(new Error('disk full')) : Promise.resolve(),
        );

        const renames = await DataMapperMetadataService.duplicateMetadataFiles(mockApi, original, 'b.xsl');

        expect(renames).toEqual({ 'a.xsl': 'b.xsl' });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('disk full'));
      });

      it('should not warn when there is no wrapper', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockApi.getResourceContent.mockImplementation((path: string) =>
          Promise.resolve(path === 'a.xsl' ? '<xsl/>' : undefined),
        );

        await DataMapperMetadataService.duplicateMetadataFiles(mockApi, original, 'b.xsl');

        expect(warnSpy).not.toHaveBeenCalled();
      });

      it('should report only the XSLT file when there is no wrapper', async () => {
        mockApi.getResourceContent.mockImplementation((path: string) =>
          Promise.resolve(path === 'a.xsl' ? '<xsl/>' : undefined),
        );

        expect(await DataMapperMetadataService.duplicateMetadataFiles(mockApi, original, 'b.xsl')).toEqual({
          'a.xsl': 'b.xsl',
        });
      });
    });

    describe('renameXsltFile', () => {
      const metadata = { xsltPath: 'a.xsl' } as IDataMapperMetadata;
      let files: Record<string, string>;
      let applyRenames: Mock<(renames: Record<string, string>) => void | Promise<void>>;

      beforeEach(() => {
        files = { 'a.xsl': '<xsl/>' };
        applyRenames = vi.fn();
        mockApi.getMetadata.mockResolvedValue(metadata);
        mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(files[path]));
        mockApi.saveResourceContent.mockImplementation((path: string, content: string) => {
          files[path] = content;
          return Promise.resolve();
        });
        mockApi.deleteResource.mockImplementation((path: string) => {
          delete files[path];
          return Promise.resolve(true);
        });
      });

      it('should copy the XSLT file, update the metadata, apply the renames and delete the old file', async () => {
        const renames = await DataMapperMetadataService.renameXsltFile(mockApi, 'id', 'b.xsl', applyRenames);

        expect(renames).toEqual({ 'a.xsl': 'b.xsl' });
        expect(applyRenames).toHaveBeenCalledWith({ 'a.xsl': 'b.xsl' });
        expect(files['b.xsl']).toBe('<xsl/>');
        expect(files['a.xsl']).toBeUndefined();
        expect(mockApi.setMetadata).toHaveBeenCalledWith('id', expect.objectContaining({ xsltPath: 'b.xsl' }));
      });

      it('should delete the old files only after the renames were applied', async () => {
        files['a-validation-wrapper.xsd'] = GENERATED_WRAPPER;
        applyRenames.mockImplementation(() => {
          expect(mockApi.deleteResource).not.toHaveBeenCalled();
        });

        const renames = await DataMapperMetadataService.renameXsltFile(mockApi, 'id', 'b.xsl', applyRenames);

        expect(renames).toEqual({ 'a.xsl': 'b.xsl', 'a-validation-wrapper.xsd': 'b-validation-wrapper.xsd' });
        expect(files['b-validation-wrapper.xsd']).toBe(GENERATED_WRAPPER);
        expect(files['a-validation-wrapper.xsd']).toBeUndefined();
        expect(files['a.xsl']).toBeUndefined();
        expect(applyRenames).toHaveBeenCalledTimes(1);
      });

      it('should move the aggregators of the wrapper too', async () => {
        files['a-validation-wrapper.xsd'] =
          `${GENERATED_WRAPPER}<xs:import namespace="urn:x" schemaLocation="a-validation-wrapper-1.xsd"/>`;
        files['a-validation-wrapper-1.xsd'] = `${GENERATED_WRAPPER}<xs:include schemaLocation="x.xsd"/>`;
        const oldAggregator = files['a-validation-wrapper-1.xsd'];

        const renames = await DataMapperMetadataService.renameXsltFile(mockApi, 'id', 'b.xsl', applyRenames);

        expect(renames).toEqual({
          'a.xsl': 'b.xsl',
          'a-validation-wrapper.xsd': 'b-validation-wrapper.xsd',
          'a-validation-wrapper-1.xsd': 'b-validation-wrapper-1.xsd',
        });
        expect(files['b-validation-wrapper.xsd']).toContain('schemaLocation="b-validation-wrapper-1.xsd"');
        expect(files['b-validation-wrapper-1.xsd']).toBe(oldAggregator);
        expect(Object.keys(files).sort()).toEqual(['b-validation-wrapper-1.xsd', 'b-validation-wrapper.xsd', 'b.xsl']);
      });

      it('should delete an old XSLT file whose name looks like a schema, without a generated-marker check', async () => {
        mockApi.getMetadata.mockResolvedValue({ xsltPath: 'a.xsd' } as IDataMapperMetadata);
        files = { 'a.xsd': '<xsl/>' };

        const renames = await DataMapperMetadataService.renameXsltFile(mockApi, 'id', 'b.xsd', applyRenames);

        expect(renames).toEqual({ 'a.xsd': 'b.xsd' });
        expect(files['a.xsd']).toBeUndefined();
        expect(files['b.xsd']).toBe('<xsl/>');
      });

      it('should still succeed, and warn, when reading an old wrapper to classify it fails', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        files['a-validation-wrapper.xsd'] = GENERATED_WRAPPER;
        applyRenames.mockImplementation(() => {
          mockApi.getResourceContent.mockImplementation((path: string) =>
            path === 'a-validation-wrapper.xsd'
              ? Promise.reject(new Error('unreadable'))
              : Promise.resolve(files[path]),
          );
        });

        const renames = await DataMapperMetadataService.renameXsltFile(mockApi, 'id', 'b.xsl', applyRenames);

        expect(renames).toEqual({ 'a.xsl': 'b.xsl', 'a-validation-wrapper.xsd': 'b-validation-wrapper.xsd' });
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('a-validation-wrapper.xsd'));
        expect(files['a.xsl']).toBeUndefined();
      });

      it('should report the copy failure, and warn, when removing the new files fails too', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        files['a-validation-wrapper.xsd'] = GENERATED_WRAPPER;
        files['b-validation-wrapper.xsd'] = '<xs:schema>user</xs:schema>';
        mockApi.deleteResource.mockRejectedValue(new Error('locked'));

        await expect(DataMapperMetadataService.renameXsltFile(mockApi, 'id', 'b.xsl', applyRenames)).rejects.toThrow(
          /the document was not renamed: .*b-validation-wrapper\.xsd/s,
        );

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not remove "b.xsl"'));
      });

      it('should not delete an old wrapper that is a user file', async () => {
        files['a-validation-wrapper.xsd'] = GENERATED_WRAPPER;
        applyRenames.mockImplementation(() => {
          // The user replaced the generated wrapper while the rename was running
          files['a-validation-wrapper.xsd'] = '<xs:schema>user</xs:schema>';
        });

        await DataMapperMetadataService.renameXsltFile(mockApi, 'id', 'b.xsl', applyRenames);

        expect(files['a-validation-wrapper.xsd']).toBe('<xs:schema>user</xs:schema>');
        expect(files['a.xsl']).toBeUndefined();
      });

      it('should abort, remove the new files and keep the old ones when the wrapper could not be copied', async () => {
        files['a-validation-wrapper.xsd'] = GENERATED_WRAPPER;
        files['b-validation-wrapper.xsd'] = '<xs:schema>user</xs:schema>';

        await expect(DataMapperMetadataService.renameXsltFile(mockApi, 'id', 'b.xsl', applyRenames)).rejects.toThrow(
          /Could not copy the validation wrapper of "a\.xsl", the document was not renamed: .*b-validation-wrapper\.xsd.*Validate output/s,
        );

        expect(files['b.xsl']).toBeUndefined();
        expect(files['a.xsl']).toBe('<xsl/>');
        expect(files['a-validation-wrapper.xsd']).toBe(GENERATED_WRAPPER);
        expect(files['b-validation-wrapper.xsd']).toBe('<xs:schema>user</xs:schema>');
        expect(mockApi.setMetadata).not.toHaveBeenCalled();
        expect(applyRenames).not.toHaveBeenCalled();
      });

      it('should reject, and leave everything alone, when saving the new XSLT file fails', async () => {
        mockApi.saveResourceContent.mockRejectedValue(new Error('disk full'));

        await expect(DataMapperMetadataService.renameXsltFile(mockApi, 'id', 'b.xsl', applyRenames)).rejects.toThrow(
          'Could not rename the document to "b.xsl": disk full',
        );

        expect(mockApi.setMetadata).not.toHaveBeenCalled();
        expect(mockApi.deleteResource).not.toHaveBeenCalled();
        expect(applyRenames).not.toHaveBeenCalled();
      });

      it('should reject, and not delete the existing file, when the target exists', async () => {
        files['b.xsl'] = '<other/>';

        await expect(DataMapperMetadataService.renameXsltFile(mockApi, 'id', 'b.xsl', applyRenames)).rejects.toThrow(
          'Could not rename the document to "b.xsl": the file already exists',
        );

        expect(files['b.xsl']).toBe('<other/>');
        expect(mockApi.saveResourceContent).not.toHaveBeenCalled();
        expect(mockApi.deleteResource).not.toHaveBeenCalled();
      });

      it('should remove the new files when updating the metadata fails', async () => {
        mockApi.setMetadata.mockRejectedValue(new Error('locked'));

        await expect(DataMapperMetadataService.renameXsltFile(mockApi, 'id', 'b.xsl', applyRenames)).rejects.toThrow(
          'Could not rename the document to "b.xsl": locked',
        );

        expect(files['b.xsl']).toBeUndefined();
        expect(files['a.xsl']).toBe('<xsl/>');
        expect(applyRenames).not.toHaveBeenCalled();
      });

      it('should point the metadata back and delete nothing when applying the renames throws', async () => {
        files['a-validation-wrapper.xsd'] = GENERATED_WRAPPER;
        applyRenames.mockRejectedValue(new Error('model update failed'));

        await expect(DataMapperMetadataService.renameXsltFile(mockApi, 'id', 'b.xsl', applyRenames)).rejects.toThrow(
          'Could not rename the document to "b.xsl": model update failed',
        );

        expect(mockApi.setMetadata).toHaveBeenLastCalledWith('id', expect.objectContaining({ xsltPath: 'a.xsl' }));
        expect(mockApi.deleteResource).not.toHaveBeenCalled();
        expect(files['a.xsl']).toBe('<xsl/>');
        expect(files['b.xsl']).toBe('<xsl/>');
        expect(files['b-validation-wrapper.xsd']).toBe(GENERATED_WRAPPER);
      });

      it('should still report the rename failure, and warn, when pointing the metadata back fails too', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        applyRenames.mockRejectedValue(new Error('model update failed'));
        mockApi.setMetadata.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('locked'));

        await expect(DataMapperMetadataService.renameXsltFile(mockApi, 'id', 'b.xsl', applyRenames)).rejects.toThrow(
          'Could not rename the document to "b.xsl": model update failed',
        );

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not point the metadata back to "a.xsl"'));
        expect(mockApi.deleteResource).not.toHaveBeenCalled();
      });

      it('should still succeed, and warn, when deleting an old file fails', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockApi.deleteResource.mockRejectedValue(new Error('locked'));

        const renames = await DataMapperMetadataService.renameXsltFile(mockApi, 'id', 'b.xsl', applyRenames);

        expect(renames).toEqual({ 'a.xsl': 'b.xsl' });
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('a.xsl'));
      });

      it.each<[string, () => void, string?]>([
        [
          'there is no metadata',
          () => {
            mockApi.getMetadata.mockResolvedValue(undefined);
          },
        ],
        ['the path did not change', () => undefined, 'a.xsl'],
        [
          'the XSLT file does not exist',
          () => {
            delete files['a.xsl'];
          },
        ],
      ])('should return undefined when %s', async (_name, arrange, target = 'b.xsl') => {
        arrange();

        expect(await DataMapperMetadataService.renameXsltFile(mockApi, 'id', target, applyRenames)).toBeUndefined();
        expect(mockApi.saveResourceContent).not.toHaveBeenCalled();
        expect(applyRenames).not.toHaveBeenCalled();
      });
    });

    describe('loadTargetBodyDefinition', () => {
      it('should load the target body schema files in filePath order', async () => {
        mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(`<${path}/>`));
        const metadata: IDataMapperMetadata = {
          sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
          sourceParameters: {},
          targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['b.xsd', 'a.xsd'] },
          xsltPath: 'a.xsl',
        };

        const definition = await DataMapperMetadataService.loadTargetBodyDefinition(mockApi, metadata);

        expect(definition.documentType).toBe(DocumentType.TARGET_BODY);
        expect(Object.keys(definition.definitionFiles ?? {})).toEqual(['b.xsd', 'a.xsd']);
      });
    });
  });

  describe('deleteXsltFile', () => {
    it('should delete XSLT file associated with metadata', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      mockApi.getMetadata.mockResolvedValue(metadata);

      await DataMapperMetadataService.deleteXsltFile(mockApi, 'test-id');

      expect(mockApi.getMetadata).toHaveBeenCalledWith('test-id');
      expect(mockApi.deleteResource).toHaveBeenCalledWith('transform.xsl');
    });

    it('should handle case when metadata does not exist', async () => {
      mockApi.getMetadata.mockResolvedValue(undefined);

      await expect(DataMapperMetadataService.deleteXsltFile(mockApi, 'test-id')).rejects.toThrow();
    });
  });

  describe('doLoadDocument (via loadDocuments)', () => {
    it('should use Primitive type when document metadata type is undefined', async () => {
      const metadata: IDataMapperMetadata = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sourceBody: { type: undefined as any, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(result.sourceBody.definitionType).toBe(DocumentDefinitionType.Primitive);
    });

    it('should handle undefined filePath gracefully', async () => {
      const metadata: IDataMapperMetadata = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: undefined as any },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(result.sourceBody).toBeDefined();
      expect(result.sourceBody.definitionFiles).toEqual({});
    });

    it('should keep definitionFiles in filePath order regardless of read completion order', async () => {
      const delays: Record<string, number> = { 'a.xsd': 30, 'b.xsd': 0, 'c.xsd': 10 };
      mockApi.getResourceContent.mockImplementation(
        (path: string) =>
          new Promise((resolve) =>
            setTimeout(() => {
              resolve(`<${path}/>`);
            }, delays[path] ?? 0),
          ),
      );
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['a.xsd', 'b.xsd', 'c.xsd'] },
        xsltPath: 'transform.xsl',
      };

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(Object.keys(result.targetBody.definitionFiles ?? {})).toEqual(['a.xsd', 'b.xsd', 'c.xsd']);
    });

    it('should skip files that are empty or cannot be read, keeping the order of the rest', async () => {
      mockApi.getResourceContent.mockImplementation((path: string) => {
        if (path === 'broken.xsd') return Promise.reject(new Error('boom'));
        if (path === 'empty.xsd') return Promise.resolve('');
        return Promise.resolve(`<${path}/>`);
      });
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['first.xsd', 'broken.xsd', 'empty.xsd', 'last.xsd'],
        },
        xsltPath: 'transform.xsl',
      };

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(Object.keys(result.targetBody.definitionFiles ?? {})).toEqual(['first.xsd', 'last.xsd']);
    });
  });

  describe('doCreateDocumentMetadata (via update methods)', () => {
    it('should save schema files when shouldSaveSchema is true', async () => {
      mockApi.shouldSaveSchema = true;
      mockApi.saveResourceContent.mockResolvedValue(undefined);
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'source.xsd': '<schema/>' },
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(mockApi.saveResourceContent).toHaveBeenCalledWith('source.xsd', '<schema/>');
    });

    it('should not save schema files when shouldSaveSchema is false', async () => {
      mockApi.shouldSaveSchema = false;
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'source.xsd': '<schema/>' },
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(mockApi.saveResourceContent).not.toHaveBeenCalled();
    });

    it('should handle file save errors gracefully', async () => {
      mockApi.shouldSaveSchema = true;
      mockApi.saveResourceContent.mockRejectedValue(new Error('Save failed'));
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'source.xsd': '<schema/>' },
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      // The promise should still resolve despite the error
      expect(metadata.sourceBody.filePath).toEqual(['source.xsd']);

      consoleLogSpy.mockRestore();
    });
  });

  describe('getFieldTypeOverrides()', () => {
    it('should return field type overrides for source body', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['source.xsd'],
          fieldTypeOverrides: [
            {
              schemaPath: '/ns0:Root/Field1',
              type: 'ns0:Type1',
              originalType: 'xs:anyType',
              variant: FieldOverrideVariant.SAFE,
            },
            {
              schemaPath: '/ns0:Root/Field2',
              type: 'ns0:Type2',
              originalType: 'xs:anyType',
              variant: FieldOverrideVariant.SAFE,
            },
          ],
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      const overrides = DataMapperMetadataService.getFieldTypeOverrides(metadata, DocumentType.SOURCE_BODY);

      expect(overrides).toHaveLength(2);
      expect(overrides[0]).toEqual({
        schemaPath: '/ns0:Root/Field1',
        type: 'ns0:Type1',
        originalType: 'xs:anyType',
        variant: FieldOverrideVariant.SAFE,
      });
      expect(overrides[1]).toEqual({
        schemaPath: '/ns0:Root/Field2',
        type: 'ns0:Type2',
        originalType: 'xs:anyType',
        variant: FieldOverrideVariant.SAFE,
      });
    });

    it('should return field type overrides for target body', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['target.xsd'],
          fieldTypeOverrides: [
            {
              schemaPath: '/ns1:Order/ShipTo',
              type: 'ns1:ExtendedShipTo',
              originalType: 'xs:anyType',
              variant: FieldOverrideVariant.SAFE,
            },
          ],
        },
        xsltPath: 'transform.xsl',
      };

      const overrides = DataMapperMetadataService.getFieldTypeOverrides(metadata, DocumentType.TARGET_BODY);

      expect(overrides).toHaveLength(1);
      expect(overrides[0]).toEqual({
        schemaPath: '/ns1:Order/ShipTo',
        type: 'ns1:ExtendedShipTo',
        originalType: 'xs:anyType',
        variant: FieldOverrideVariant.SAFE,
      });
    });

    it('should return field type overrides for source parameter', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {
          param1: {
            type: DocumentDefinitionType.XML_SCHEMA,
            filePath: ['param1.xsd'],
            fieldTypeOverrides: [
              {
                schemaPath: '/ns0:Config/Setting',
                type: 'xs:string',
                originalType: 'xs:anyType',
                variant: FieldOverrideVariant.SAFE,
              },
            ],
          },
        },
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      const overrides = DataMapperMetadataService.getFieldTypeOverrides(metadata, DocumentType.PARAM, 'param1');

      expect(overrides).toHaveLength(1);
      expect(overrides[0]).toEqual({
        schemaPath: '/ns0:Config/Setting',
        type: 'xs:string',
        originalType: 'xs:anyType',
        variant: FieldOverrideVariant.SAFE,
      });
    });

    it('should return empty array when fieldTypeOverrides is undefined', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['source.xsd'] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      const overrides = DataMapperMetadataService.getFieldTypeOverrides(metadata, DocumentType.SOURCE_BODY);

      expect(overrides).toEqual([]);
    });

    it('should return empty array when fieldTypeOverrides is empty', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['source.xsd'],
          fieldTypeOverrides: [],
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      const overrides = DataMapperMetadataService.getFieldTypeOverrides(metadata, DocumentType.SOURCE_BODY);

      expect(overrides).toEqual([]);
    });

    it('should return empty array for non-existent parameter', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      const overrides = DataMapperMetadataService.getFieldTypeOverrides(metadata, DocumentType.PARAM, 'nonexistent');

      expect(overrides).toEqual([]);
    });

    it('should return empty array for PARAM document type without paramName', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      const overrides = DataMapperMetadataService.getFieldTypeOverrides(metadata, DocumentType.PARAM);

      expect(overrides).toEqual([]);
    });

    it('should return empty array for unknown DocumentType', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      const overrides = DataMapperMetadataService.getFieldTypeOverrides(metadata, 99 as unknown as DocumentType);

      expect(overrides).toEqual([]);
    });
  });

  describe('setFieldTypeOverrides()', () => {
    it('should replace all field type overrides on source body', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['source.xsd'],
          fieldTypeOverrides: [
            {
              schemaPath: '/ns0:Root/OldField',
              type: 'xs:int',
              originalType: 'xs:string',
              variant: FieldOverrideVariant.FORCE,
            },
          ],
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
        namespaceMap: { ns0: 'http://example.com/source' },
      };
      const newOverrides: IFieldTypeOverride[] = [
        {
          schemaPath: '/ns0:Root/Field1',
          type: 'xs:boolean',
          originalType: 'xs:string',
          variant: FieldOverrideVariant.SAFE,
        },
        {
          schemaPath: '/ns0:Root/Field2',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: FieldOverrideVariant.FORCE,
        },
      ];

      await DataMapperMetadataService.setFieldTypeOverrides(
        mockApi,
        'test-id',
        metadata,
        DocumentType.SOURCE_BODY,
        undefined,
        newOverrides,
      );

      expect(metadata.sourceBody.fieldTypeOverrides).toEqual(newOverrides);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should replace all field type overrides on target body', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['target.xsd'] },
        xsltPath: 'transform.xsl',
      };
      const overrides: IFieldTypeOverride[] = [
        {
          schemaPath: '/ns1:Order/ShipTo',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: FieldOverrideVariant.FORCE,
        },
      ];

      await DataMapperMetadataService.setFieldTypeOverrides(
        mockApi,
        'test-id',
        metadata,
        DocumentType.TARGET_BODY,
        undefined,
        overrides,
      );

      expect(metadata.targetBody.fieldTypeOverrides).toEqual(overrides);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should replace all field type overrides on source parameter', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {
          param1: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['param1.xsd'] },
        },
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const overrides: IFieldTypeOverride[] = [
        {
          schemaPath: '/ns0:Config/Setting',
          type: 'xs:string',
          originalType: 'xs:anyType',
          variant: FieldOverrideVariant.SAFE,
        },
      ];

      await DataMapperMetadataService.setFieldTypeOverrides(
        mockApi,
        'test-id',
        metadata,
        DocumentType.PARAM,
        'param1',
        overrides,
      );

      expect(metadata.sourceParameters['param1'].fieldTypeOverrides).toEqual(overrides);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should clear all field type overrides when given empty array', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['source.xsd'],
          fieldTypeOverrides: [
            {
              schemaPath: '/ns0:Root/Field',
              type: 'xs:int',
              originalType: 'xs:string',
              variant: FieldOverrideVariant.FORCE,
            },
          ],
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      await DataMapperMetadataService.setFieldTypeOverrides(
        mockApi,
        'test-id',
        metadata,
        DocumentType.SOURCE_BODY,
        undefined,
        [],
      );

      expect(metadata.sourceBody.fieldTypeOverrides).toEqual([]);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should do nothing when document metadata is not found', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      await DataMapperMetadataService.setFieldTypeOverrides(
        mockApi,
        'test-id',
        metadata,
        DocumentType.PARAM,
        'nonexistent',
        [],
      );

      expect(mockApi.setMetadata).not.toHaveBeenCalled();
    });
  });

  describe('setChoiceSelections()', () => {
    it('should set choice selections on source body', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['source.xsd'] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
        namespaceMap: { ns0: 'http://example.com/source' },
      };
      const selections: IChoiceSelection[] = [
        { schemaPath: '/ns0:Root/{choice:0}', selectedMemberIndex: 1 },
        { schemaPath: '/ns0:Root/{choice:1}', selectedMemberIndex: 0 },
      ];

      await DataMapperMetadataService.setChoiceSelections(
        mockApi,
        'test-id',
        metadata,
        DocumentType.SOURCE_BODY,
        undefined,
        selections,
      );

      expect(metadata.sourceBody.choiceSelections).toEqual(selections);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should set choice selections on target body', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['target.xsd'] },
        xsltPath: 'transform.xsl',
        namespaceMap: { ns1: 'http://example.com/target' },
      };
      const selections: IChoiceSelection[] = [{ schemaPath: '/ns1:Order/{choice:0}', selectedMemberIndex: 0 }];

      await DataMapperMetadataService.setChoiceSelections(
        mockApi,
        'test-id',
        metadata,
        DocumentType.TARGET_BODY,
        undefined,
        selections,
      );

      expect(metadata.targetBody.choiceSelections).toEqual(selections);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should set choice selections on source parameter', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {
          param1: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['param1.xsd'] },
        },
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
        namespaceMap: { ns0: 'http://example.com/param' },
      };
      const selections: IChoiceSelection[] = [{ schemaPath: '/ns0:Config/{choice:0}', selectedMemberIndex: 1 }];

      await DataMapperMetadataService.setChoiceSelections(
        mockApi,
        'test-id',
        metadata,
        DocumentType.PARAM,
        'param1',
        selections,
      );

      expect(metadata.sourceParameters['param1'].choiceSelections).toEqual(selections);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should overwrite existing choice selections', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['source.xsd'],
          choiceSelections: [{ schemaPath: '/ns0:Root/{choice:0}', selectedMemberIndex: 0 }],
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
        namespaceMap: { ns0: 'http://example.com/source' },
      };
      const newSelections: IChoiceSelection[] = [
        { schemaPath: '/ns0:Root/{choice:0}', selectedMemberIndex: 2 },
        { schemaPath: '/ns0:Root/{choice:0}/ns0:Option1/{choice:0}', selectedMemberIndex: 1 },
      ];

      await DataMapperMetadataService.setChoiceSelections(
        mockApi,
        'test-id',
        metadata,
        DocumentType.SOURCE_BODY,
        undefined,
        newSelections,
      );

      expect(metadata.sourceBody.choiceSelections).toEqual(newSelections);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should handle non-existent parameter gracefully', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      await DataMapperMetadataService.setChoiceSelections(
        mockApi,
        'test-id',
        metadata,
        DocumentType.PARAM,
        'nonexistent',
        [{ schemaPath: '/ns0:Root/{choice:0}', selectedMemberIndex: 0 }],
      );

      expect(mockApi.setMetadata).not.toHaveBeenCalled();
    });
  });

  describe('getChoiceSelections()', () => {
    it('should return choice selections for source body', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['source.xsd'],
          choiceSelections: [
            { schemaPath: '/ns0:Root/{choice:0}', selectedMemberIndex: 0 },
            { schemaPath: '/ns0:Root/{choice:1}', selectedMemberIndex: 1 },
          ],
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
        namespaceMap: { ns0: 'http://example.com/source' },
      };

      const selections = DataMapperMetadataService.getChoiceSelections(metadata, DocumentType.SOURCE_BODY);

      expect(selections).toHaveLength(2);
      expect(selections[0]).toEqual({ schemaPath: '/ns0:Root/{choice:0}', selectedMemberIndex: 0 });
      expect(selections[1]).toEqual({ schemaPath: '/ns0:Root/{choice:1}', selectedMemberIndex: 1 });
    });

    it('should return choice selections for target body', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['target.xsd'],
          choiceSelections: [{ schemaPath: '/ns1:Order/{choice:0}', selectedMemberIndex: 0 }],
        },
        xsltPath: 'transform.xsl',
        namespaceMap: { ns1: 'http://example.com/target' },
      };

      const selections = DataMapperMetadataService.getChoiceSelections(metadata, DocumentType.TARGET_BODY);

      expect(selections).toHaveLength(1);
      expect(selections[0]).toEqual({ schemaPath: '/ns1:Order/{choice:0}', selectedMemberIndex: 0 });
    });

    it('should return choice selections for source parameter', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {
          param1: {
            type: DocumentDefinitionType.XML_SCHEMA,
            filePath: ['param1.xsd'],
            choiceSelections: [{ schemaPath: '/ns0:Config/{choice:0}', selectedMemberIndex: 1 }],
          },
        },
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
        namespaceMap: { ns0: 'http://example.com/param' },
      };

      const selections = DataMapperMetadataService.getChoiceSelections(metadata, DocumentType.PARAM, 'param1');

      expect(selections).toHaveLength(1);
      expect(selections[0]).toEqual({ schemaPath: '/ns0:Config/{choice:0}', selectedMemberIndex: 1 });
    });

    it('should return empty array when choiceSelections is undefined', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['source.xsd'] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      const selections = DataMapperMetadataService.getChoiceSelections(metadata, DocumentType.SOURCE_BODY);

      expect(selections).toEqual([]);
    });

    it('should return empty array when choiceSelections is empty', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['source.xsd'],
          choiceSelections: [],
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      const selections = DataMapperMetadataService.getChoiceSelections(metadata, DocumentType.SOURCE_BODY);

      expect(selections).toEqual([]);
    });

    it('should return empty array for non-existent parameter', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      const selections = DataMapperMetadataService.getChoiceSelections(metadata, DocumentType.PARAM, 'nonexistent');

      expect(selections).toEqual([]);
    });
  });

  describe('setNamespaceMap()', () => {
    it('should set the namespace map', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
        namespaceMap: {},
      };
      const namespaceMap = {
        ns0: 'http://example.com/source',
        ns1: 'http://example.com/target',
      };

      await DataMapperMetadataService.setNamespaceMap(mockApi, 'test-id', metadata, namespaceMap);

      expect(metadata.namespaceMap).toEqual(namespaceMap);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should replace existing namespace map', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
        namespaceMap: { old: 'http://old.com' },
      };
      const newNamespaceMap = {
        ns0: 'http://new.com',
      };

      await DataMapperMetadataService.setNamespaceMap(mockApi, 'test-id', metadata, newNamespaceMap);

      expect(metadata.namespaceMap).toEqual(newNamespaceMap);
      expect(metadata.namespaceMap).not.toHaveProperty('old');
    });
  });

  describe('getNamespaceMap()', () => {
    it('should return namespace map when it exists', () => {
      const namespaceMap = {
        ns0: 'http://example.com/source',
        ns1: 'http://example.com/target',
      };
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
        namespaceMap,
      };

      const result = DataMapperMetadataService.getNamespaceMap(metadata);

      expect(result).toEqual(namespaceMap);
    });

    it('should return empty object when namespace map is undefined', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      const result = DataMapperMetadataService.getNamespaceMap(metadata);

      expect(result).toEqual({});
    });

    it('should return empty object when namespace map is empty', () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
        namespaceMap: {},
      };

      const result = DataMapperMetadataService.getNamespaceMap(metadata);

      expect(result).toEqual({});
    });
  });

  describe('updateXsltPath', () => {
    it('should update the XSLT path in metadata', async () => {
      const metadataId = 'test-metadata-id';
      const originalMetadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'old-transform.xsl',
        namespaceMap: {},
      };
      const newXsltPath = 'new-transform.xsl';

      await DataMapperMetadataService.updateXsltPath(mockApi, metadataId, originalMetadata, newXsltPath);

      expect(mockApi.setMetadata).toHaveBeenCalledWith(metadataId, {
        ...originalMetadata,
        xsltPath: newXsltPath,
      });
    });

    it('should preserve all other metadata properties when updating XSLT path', async () => {
      const metadataId = 'test-metadata-id';
      const originalMetadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['source.xsd'] },
        sourceParameters: { param1: { type: DocumentDefinitionType.Primitive, filePath: [] } },
        targetBody: { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['target.json'] },
        xsltPath: 'old-transform.xsl',
        namespaceMap: { ns1: 'http://example.com' },
      };
      const newXsltPath = 'new-transform.xsl';

      await DataMapperMetadataService.updateXsltPath(mockApi, metadataId, originalMetadata, newXsltPath);

      expect(mockApi.setMetadata).toHaveBeenCalledWith(metadataId, {
        sourceBody: originalMetadata.sourceBody,
        sourceParameters: originalMetadata.sourceParameters,
        targetBody: originalMetadata.targetBody,
        xsltPath: newXsltPath,
        namespaceMap: originalMetadata.namespaceMap,
      });
    });
  });
});
