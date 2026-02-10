import { BODY_DOCUMENT_ID, DocumentDefinition, DocumentDefinitionType, DocumentType } from '../models/datamapper';
import { IDataMapperMetadata, IFieldTypeOverride } from '../models/datamapper/metadata';
import { TypeOverrideVariant } from '../models/datamapper/types';
import { IMetadataApi } from '../providers';
import { commonTypesJsonSchema, customerJsonSchema, orderJsonSchema } from '../stubs/datamapper/data-mapper';
import { DataMapperMetadataService } from './datamapper-metadata.service';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { EMPTY_XSL } from './mapping-serializer.service';

describe('DataMapperMetadataService', () => {
  let mockApi: jest.Mocked<IMetadataApi>;

  beforeEach(() => {
    mockApi = {
      getMetadata: jest.fn(),
      setMetadata: jest.fn(),
      getResourceContent: jest.fn(),
      saveResourceContent: jest.fn(),
      deleteResource: jest.fn(),
      askUserForFileSelection: jest.fn(),
      getSuggestions: jest.fn(),
      shouldSaveSchema: false,
      onStepUpdated: jest.fn(),
    } as jest.Mocked<IMetadataApi>;
  });

  afterEach(() => {
    jest.clearAllMocks();
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

      const spy = jest.spyOn(DataMapperMetadataService as never, 'doLoadDocument');

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

      mockApi.getResourceContent.mockImplementation((path) => {
        if (path === 'Order.schema.json') return Promise.resolve(orderJsonSchema);
        if (path === 'Customer.schema.json') return Promise.resolve(customerJsonSchema);
        if (path === 'CommonTypes.schema.json') return Promise.resolve(commonTypesJsonSchema);
        return Promise.resolve(undefined);
      });

      const result = await DataMapperMetadataService.loadDocuments(mockApi, metadata);

      expect(result.sourceBody.rootElementChoice).toBeDefined();
      expect(result.sourceBody.rootElementChoice?.name).toBe('Customer.schema.json');

      const docResult = JsonSchemaDocumentService.createJsonSchemaDocument(result.sourceBody);
      if (docResult.validationStatus !== 'success') {
        throw new Error(`Validation failed: ${docResult.errors?.join('; ')}`);
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

      mockApi.getResourceContent.mockImplementation((path) => {
        if (path === 'Order.schema.json') return Promise.resolve(orderJsonSchema);
        if (path === 'Customer.schema.json') return Promise.resolve(customerJsonSchema);
        if (path === 'CommonTypes.schema.json') return Promise.resolve(commonTypesJsonSchema);
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

    it('should handle file read errors gracefully', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['nonexistent.xsd'] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      mockApi.getResourceContent.mockRejectedValue(new Error('File not found'));
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

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
          'Order.schema.json': orderJsonSchema,
          'Customer.schema.json': customerJsonSchema,
          'CommonTypes.schema.json': commonTypesJsonSchema,
        },
        { namespaceUri: '', name: 'Customer.schema.json' },
      );

      await DataMapperMetadataService.updateSourceBodyMetadata(mockApi, 'test-id', metadata, definition);

      expect(metadata.sourceBody.rootElementChoice).toBeDefined();
      expect(metadata.sourceBody.rootElementChoice?.name).toBe('Customer.schema.json');
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
        canPickMany: false,
        placeHolder: expect.stringContaining('Choose the schema file to attach'),
        title: 'Attaching document schema file',
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
    it('should delete metadata by setting it to undefined', async () => {
      await DataMapperMetadataService.deleteMetadata(mockApi, 'test-id');

      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', undefined);
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
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

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

  describe('setFieldTypeOverride()', () => {
    it('should add field type override to source body', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['source.xsd'], fieldTypeOverrides: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
        namespaceMap: { ns0: 'http://example.com/source' },
      };
      const override: IFieldTypeOverride = {
        path: '/ns0:Root/Field',
        type: 'ns0:CustomType',
        originalType: 'xs:anyType',
        variant: TypeOverrideVariant.SAFE,
      };

      await DataMapperMetadataService.setFieldTypeOverride(
        mockApi,
        'test-id',
        metadata,
        DocumentType.SOURCE_BODY,
        undefined,
        override,
      );

      expect(metadata.sourceBody.fieldTypeOverrides).toHaveLength(1);
      expect(metadata.sourceBody.fieldTypeOverrides?.[0]).toEqual(override);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should update existing field type override when path matches', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['source.xsd'],
          fieldTypeOverrides: [
            {
              path: '/ns0:Root/Field',
              type: 'ns0:OldType',
              originalType: 'xs:anyType',
              variant: TypeOverrideVariant.SAFE,
            },
          ],
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
        namespaceMap: { ns0: 'http://example.com/source' },
      };
      const newOverride: IFieldTypeOverride = {
        path: '/ns0:Root/Field',
        type: 'ns0:NewType',
        originalType: 'ns0:OldType',
        variant: TypeOverrideVariant.FORCE,
      };

      await DataMapperMetadataService.setFieldTypeOverride(
        mockApi,
        'test-id',
        metadata,
        DocumentType.SOURCE_BODY,
        undefined,
        newOverride,
      );

      expect(metadata.sourceBody.fieldTypeOverrides).toHaveLength(1);
      expect(metadata.sourceBody.fieldTypeOverrides?.[0].type).toBe('ns0:NewType');
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should add field type override to target body', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['target.xsd'], fieldTypeOverrides: [] },
        xsltPath: 'transform.xsl',
        namespaceMap: { ns1: 'http://example.com/target' },
      };
      const override: IFieldTypeOverride = {
        path: '/ns1:Order/ShipTo',
        type: 'ns1:ExtendedShipTo',
        originalType: 'ns1:ShipTo',
        variant: TypeOverrideVariant.SAFE,
      };

      await DataMapperMetadataService.setFieldTypeOverride(
        mockApi,
        'test-id',
        metadata,
        DocumentType.TARGET_BODY,
        undefined,
        override,
      );

      expect(metadata.targetBody.fieldTypeOverrides).toHaveLength(1);
      expect(metadata.targetBody.fieldTypeOverrides?.[0]).toEqual(override);
    });

    it('should add field type override to source parameter', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {
          param1: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['param1.xsd'], fieldTypeOverrides: [] },
        },
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const override: IFieldTypeOverride = {
        path: '/ns0:Config/Setting',
        type: 'xs:string',
        originalType: 'xs:anyType',
        variant: TypeOverrideVariant.SAFE,
      };

      await DataMapperMetadataService.setFieldTypeOverride(
        mockApi,
        'test-id',
        metadata,
        DocumentType.PARAM,
        'param1',
        override,
      );

      expect(metadata.sourceParameters['param1'].fieldTypeOverrides).toHaveLength(1);
      expect(metadata.sourceParameters['param1'].fieldTypeOverrides?.[0]).toEqual(override);
    });

    it('should initialize fieldTypeOverrides if undefined', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['source.xsd'] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const override: IFieldTypeOverride = {
        path: '/ns0:Root/Field',
        type: 'ns0:CustomType',
        originalType: 'xs:anyType',
        variant: TypeOverrideVariant.SAFE,
      };

      await DataMapperMetadataService.setFieldTypeOverride(
        mockApi,
        'test-id',
        metadata,
        DocumentType.SOURCE_BODY,
        undefined,
        override,
      );

      expect(metadata.sourceBody.fieldTypeOverrides).toBeDefined();
      expect(metadata.sourceBody.fieldTypeOverrides).toHaveLength(1);
    });

    it('should handle non-existent parameter gracefully', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };
      const override: IFieldTypeOverride = {
        path: '/ns0:Field',
        type: 'xs:string',
        originalType: 'xs:anyType',
        variant: TypeOverrideVariant.SAFE,
      };

      await DataMapperMetadataService.setFieldTypeOverride(
        mockApi,
        'test-id',
        metadata,
        DocumentType.PARAM,
        'nonexistent',
        override,
      );

      expect(mockApi.setMetadata).not.toHaveBeenCalled();
    });
  });

  describe('removeFieldTypeOverride()', () => {
    it('should remove field type override from source body', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['source.xsd'],
          fieldTypeOverrides: [
            {
              path: '/ns0:Root/Field1',
              type: 'ns0:Type1',
              originalType: 'xs:anyType',
              variant: TypeOverrideVariant.SAFE,
            },
            {
              path: '/ns0:Root/Field2',
              type: 'ns0:Type2',
              originalType: 'xs:anyType',
              variant: TypeOverrideVariant.SAFE,
            },
          ],
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      await DataMapperMetadataService.removeFieldTypeOverride(
        mockApi,
        'test-id',
        metadata,
        DocumentType.SOURCE_BODY,
        undefined,
        '/ns0:Root/Field1',
      );

      expect(metadata.sourceBody.fieldTypeOverrides).toHaveLength(1);
      expect(metadata.sourceBody.fieldTypeOverrides?.[0].path).toBe('/ns0:Root/Field2');
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should remove field type override from target body', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['target.xsd'],
          fieldTypeOverrides: [
            {
              path: '/ns1:Order/ShipTo',
              type: 'ns1:ExtendedShipTo',
              originalType: 'xs:anyType',
              variant: TypeOverrideVariant.SAFE,
            },
          ],
        },
        xsltPath: 'transform.xsl',
      };

      await DataMapperMetadataService.removeFieldTypeOverride(
        mockApi,
        'test-id',
        metadata,
        DocumentType.TARGET_BODY,
        undefined,
        '/ns1:Order/ShipTo',
      );

      expect(metadata.targetBody.fieldTypeOverrides).toHaveLength(0);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should remove field type override from source parameter', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {
          param1: {
            type: DocumentDefinitionType.XML_SCHEMA,
            filePath: ['param1.xsd'],
            fieldTypeOverrides: [
              {
                path: '/ns0:Config/Setting',
                type: 'xs:string',
                originalType: 'xs:anyType',
                variant: TypeOverrideVariant.SAFE,
              },
            ],
          },
        },
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      await DataMapperMetadataService.removeFieldTypeOverride(
        mockApi,
        'test-id',
        metadata,
        DocumentType.PARAM,
        'param1',
        '/ns0:Config/Setting',
      );

      expect(metadata.sourceParameters['param1'].fieldTypeOverrides).toHaveLength(0);
    });

    it('should handle non-existent path gracefully', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: {
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: ['source.xsd'],
          fieldTypeOverrides: [
            {
              path: '/ns0:Root/Field',
              type: 'ns0:Type',
              originalType: 'xs:anyType',
              variant: TypeOverrideVariant.SAFE,
            },
          ],
        },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      await DataMapperMetadataService.removeFieldTypeOverride(
        mockApi,
        'test-id',
        metadata,
        DocumentType.SOURCE_BODY,
        undefined,
        '/ns0:NonExistent',
      );

      expect(metadata.sourceBody.fieldTypeOverrides).toHaveLength(1);
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-id', metadata);
    });

    it('should handle undefined fieldTypeOverrides gracefully', async () => {
      const metadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['source.xsd'] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'transform.xsl',
      };

      await DataMapperMetadataService.removeFieldTypeOverride(
        mockApi,
        'test-id',
        metadata,
        DocumentType.SOURCE_BODY,
        undefined,
        '/ns0:Root/Field',
      );

      expect(mockApi.setMetadata).not.toHaveBeenCalled();
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
              path: '/ns0:Root/Field1',
              type: 'ns0:Type1',
              originalType: 'xs:anyType',
              variant: TypeOverrideVariant.SAFE,
            },
            {
              path: '/ns0:Root/Field2',
              type: 'ns0:Type2',
              originalType: 'xs:anyType',
              variant: TypeOverrideVariant.SAFE,
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
        path: '/ns0:Root/Field1',
        type: 'ns0:Type1',
        originalType: 'xs:anyType',
        variant: TypeOverrideVariant.SAFE,
      });
      expect(overrides[1]).toEqual({
        path: '/ns0:Root/Field2',
        type: 'ns0:Type2',
        originalType: 'xs:anyType',
        variant: TypeOverrideVariant.SAFE,
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
              path: '/ns1:Order/ShipTo',
              type: 'ns1:ExtendedShipTo',
              originalType: 'xs:anyType',
              variant: TypeOverrideVariant.SAFE,
            },
          ],
        },
        xsltPath: 'transform.xsl',
      };

      const overrides = DataMapperMetadataService.getFieldTypeOverrides(metadata, DocumentType.TARGET_BODY);

      expect(overrides).toHaveLength(1);
      expect(overrides[0]).toEqual({
        path: '/ns1:Order/ShipTo',
        type: 'ns1:ExtendedShipTo',
        originalType: 'xs:anyType',
        variant: TypeOverrideVariant.SAFE,
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
                path: '/ns0:Config/Setting',
                type: 'xs:string',
                originalType: 'xs:anyType',
                variant: TypeOverrideVariant.SAFE,
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
        path: '/ns0:Config/Setting',
        type: 'xs:string',
        originalType: 'xs:anyType',
        variant: TypeOverrideVariant.SAFE,
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
});
