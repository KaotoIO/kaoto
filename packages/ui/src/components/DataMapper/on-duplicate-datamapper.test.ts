import { onDuplicateDataMapper } from './on-duplicate-datamapper';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { IMetadataApi } from '../../providers';
import { IVisualizationNode } from '../../models';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { DocumentDefinitionType } from '../../models/datamapper';
import { IClipboardCopyObject } from '../../models/visualization/clipboard';
import { SourceSchemaType } from '../../models/camel/source-schema-type';
import { XSLT_COMPONENT_NAME } from '../../utils';

describe('onDuplicateDataMapper', () => {
  let mockApi: jest.Mocked<IMetadataApi>;
  let mockVizNode: jest.Mocked<IVisualizationNode>;
  const originalMetadataId = 'kaoto-datamapper-original-id';
  const newStepId = 'kaoto-datamapper-new-id';

  beforeEach(() => {
    mockApi = {
      getMetadata: jest.fn(),
      setMetadata: jest.fn(),
      getResourceContent: jest.fn(),
      saveResourceContent: jest.fn(),
      deleteResource: jest.fn(),
      askUserForFileSelection: jest.fn(),
      shouldSaveSchema: true,
    } as unknown as jest.Mocked<IMetadataApi>;

    mockVizNode = {} as jest.Mocked<IVisualizationNode>;

    jest.spyOn(DataMapperMetadataService, 'getDataMapperMetadataId').mockReturnValue(originalMetadataId);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create metadata and copy XSLT file for duplicated DataMapper step', async () => {
    const originalMetadata: IDataMapperMetadata = {
      sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['source.xsd'] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['target.json'] },
      xsltPath: `${originalMetadataId}.xsl`,
    };

    const xsltContent = '<xsl:stylesheet>...</xsl:stylesheet>';

    mockApi.getMetadata.mockResolvedValue(originalMetadata);
    mockApi.getResourceContent.mockResolvedValue(xsltContent);

    const content: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: 'step',
      definition: {
        id: newStepId,
        steps: [{ to: { uri: 'xslt-saxon:test.xsl' } }],
      },
    };

    await onDuplicateDataMapper(mockApi, { sourceVizNode: mockVizNode, content });

    expect(mockApi.getMetadata).toHaveBeenCalledWith(originalMetadataId);

    expect(mockApi.setMetadata).toHaveBeenCalledWith(
      newStepId,
      DataMapperMetadataService.cloneMetadata(originalMetadata, `${newStepId}.xsl`),
    );

    expect(mockApi.getResourceContent).toHaveBeenCalledWith(originalMetadata.xsltPath);

    expect(mockApi.saveResourceContent).toHaveBeenCalledWith(`${newStepId}.xsl`, xsltContent);

    const stepDef = content.definition as Record<string, unknown>;
    const steps = stepDef.steps as Array<Record<string, Record<string, unknown>>>;
    expect(steps[0].to.uri).toBe(`${XSLT_COMPONENT_NAME}:${newStepId}.xsl`);
  });

  it('should handle missing duplicated content gracefully', async () => {
    await onDuplicateDataMapper(mockApi, { sourceVizNode: mockVizNode, content: undefined });

    expect(mockApi.getMetadata).not.toHaveBeenCalled();
    expect(mockApi.setMetadata).not.toHaveBeenCalled();
  });

  it('should handle missing new step ID gracefully', async () => {
    const content: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: 'step',
      definition: {},
    };

    await onDuplicateDataMapper(mockApi, { sourceVizNode: mockVizNode, content });

    expect(mockApi.setMetadata).not.toHaveBeenCalled();
  });

  it('should create empty metadata and set XSLT URI to empty when original metadata is not found', async () => {
    mockApi.getMetadata.mockResolvedValue(undefined);

    const content: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: 'step',
      definition: {
        id: newStepId,
        steps: [{ to: { uri: `${XSLT_COMPONENT_NAME}:test.xsl` } }],
      },
    };

    await onDuplicateDataMapper(mockApi, { sourceVizNode: mockVizNode, content });

    expect(mockApi.setMetadata).toHaveBeenCalledWith(newStepId, DataMapperMetadataService.createMetadata());

    const stepDef = content.definition as Record<string, unknown>;
    const steps = stepDef.steps as Array<Record<string, Record<string, unknown>>>;
    expect(steps[0].to.uri).toBe(`${XSLT_COMPONENT_NAME}:`);
  });

  it('should handle missing XSLT content', async () => {
    const originalMetadata: IDataMapperMetadata = {
      sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      xsltPath: `${originalMetadataId}.xsl`,
    };

    mockApi.getMetadata.mockResolvedValue(originalMetadata);
    mockApi.getResourceContent.mockResolvedValue(undefined);

    const content: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: 'step',
      definition: {
        id: newStepId,
      },
    };

    await onDuplicateDataMapper(mockApi, { sourceVizNode: mockVizNode, content });

    expect(mockApi.setMetadata).toHaveBeenCalled();

    expect(mockApi.saveResourceContent).not.toHaveBeenCalled();
  });
});
