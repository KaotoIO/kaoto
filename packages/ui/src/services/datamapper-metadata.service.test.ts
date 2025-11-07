import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { createVisualizationNode } from '../models';
import { CamelRouteVisualEntity } from '../models/visualization/flows/camel-route-visual-entity';
import { BODY_DOCUMENT_ID, DocumentDefinition, DocumentDefinitionType, DocumentType } from '../models/datamapper';
import { IDataMapperMetadata } from '../models/datamapper/metadata';
import { IMetadataApi, EntitiesContextResult } from '../providers';
import { XSLT_COMPONENT_NAME } from '../utils';
import { DataMapperMetadataService } from './datamapper-metadata.service';
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

  describe('getDataMapperMetadataId', () => {
    it('should return the metadata id from the visualization node', () => {
      const entity = new CamelRouteVisualEntity({
        route: {
          id: 'test-route',
          from: { uri: 'direct:start', steps: [] },
        },
      });
      const vizNode = entity.toVizNode();

      const metadataId = DataMapperMetadataService.getDataMapperMetadataId(vizNode);

      expect(metadataId).toBe('test-route');
    });

    it('should return the id from a custom visualization node', () => {
      const vizNode = createVisualizationNode('custom-id', {});
      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue({ id: 'custom-metadata-id' });

      const metadataId = DataMapperMetadataService.getDataMapperMetadataId(vizNode);

      expect(metadataId).toBe('custom-metadata-id');
    });
  });

  describe('createMetadata', () => {
    it('should create metadata with default values when no xsltPath is provided', () => {
      const metadata = DataMapperMetadataService.createMetadata();

      expect(metadata).toEqual({
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: '',
      });
    });

    it('should create metadata with provided xsltPath', () => {
      const xsltPath = 'test-transform.xsl';
      const metadata = DataMapperMetadataService.createMetadata(xsltPath);

      expect(metadata).toEqual({
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
        xsltPath: 'test-transform.xsl',
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
    it('should initialize metadata when XSLT step exists with document name', async () => {
      const vizNode = createVisualizationNode('test-node', {});
      const mockModel = {
        id: 'test-metadata-id',
        steps: [
          {
            to: { uri: `${XSLT_COMPONENT_NAME}:existing.xsl` },
          },
        ],
      };
      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(mockModel);

      const mockEntitiesContext = {
        updateSourceCodeFromEntities: jest.fn(),
      } as unknown as EntitiesContextResult;

      const metadata = await DataMapperMetadataService.initializeDataMapperMetadata(
        mockEntitiesContext,
        vizNode,
        mockApi,
        'test-metadata-id',
      );

      expect(metadata.xsltPath).toBe('existing.xsl');
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-metadata-id', metadata);
      expect(mockApi.saveResourceContent).toHaveBeenCalledWith('existing.xsl', EMPTY_XSL);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).not.toHaveBeenCalled();
    });

    it('should create document name when XSLT step exists without document name', async () => {
      const entity = new CamelRouteVisualEntity({
        route: {
          id: 'test-route',
          from: {
            uri: 'direct:start',
            steps: [
              {
                step: {
                  id: 'datamapper-1',
                  steps: [{ to: { uri: XSLT_COMPONENT_NAME } } as ProcessorDefinition],
                },
              } as ProcessorDefinition,
            ],
          },
        },
      });
      const vizNode = entity.toVizNode();
      const mockEntitiesContext = {
        updateSourceCodeFromEntities: jest.fn(),
      } as unknown as EntitiesContextResult;

      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue({
        id: 'datamapper-1',
        steps: [{ to: { uri: XSLT_COMPONENT_NAME } }],
      });
      jest.spyOn(vizNode, 'updateModel');

      const metadata = await DataMapperMetadataService.initializeDataMapperMetadata(
        mockEntitiesContext,
        vizNode,
        mockApi,
        'test-metadata-id',
      );

      expect(metadata.xsltPath).toBe('test-metadata-id.xsl');
      expect(vizNode.updateModel).toHaveBeenCalled();
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
    });

    it('should handle case when no XSLT step is found', async () => {
      const entity = new CamelRouteVisualEntity({
        route: {
          id: 'test-route',
          from: { uri: 'direct:start', steps: [] },
        },
      });
      const vizNode = entity.toVizNode();
      const mockEntitiesContext = {
        updateSourceCodeFromEntities: jest.fn(),
      } as unknown as EntitiesContextResult;

      const metadata = await DataMapperMetadataService.initializeDataMapperMetadata(
        mockEntitiesContext,
        vizNode,
        mockApi,
        'test-metadata-id',
      );

      expect(metadata.xsltPath).toBe('');
      expect(mockApi.setMetadata).toHaveBeenCalledWith('test-metadata-id', metadata);
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

  describe('getXSLTDocumentName', () => {
    it('should extract document name from XSLT step URI', () => {
      const xsltStep = {
        to: { uri: `${XSLT_COMPONENT_NAME}:transform.xsl` },
      };

      const documentName = DataMapperMetadataService.getXSLTDocumentName(xsltStep);

      expect(documentName).toBe('transform.xsl');
    });

    it('should return undefined when xsltStep is undefined', () => {
      const documentName = DataMapperMetadataService.getXSLTDocumentName();

      expect(documentName).toBeUndefined();
    });

    it('should handle URI with only component name', () => {
      const xsltStep = {
        to: { uri: XSLT_COMPONENT_NAME },
      };

      const documentName = DataMapperMetadataService.getXSLTDocumentName(xsltStep);

      expect(documentName).toBeUndefined();
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
});
