import { onPasteDataMapper } from './on-paste-data-mapper';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { IMetadataApi } from '../../providers';
import { IVisualizationNode } from '../../models';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { DocumentDefinitionType } from '../../models/datamapper';
import { IClipboardCopyObject } from '../../models/visualization/clipboard';
import { SourceSchemaType } from '../../models/camel/source-schema-type';
import { XSLT_COMPONENT_NAME } from '../../utils';

describe('onPasteDataMapper', () => {
  let mockApi: jest.Mocked<IMetadataApi>;
  let mockVizNode: jest.Mocked<IVisualizationNode>;
  const originalStepId = 'kaoto-datamapper-original-id';
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return early when originalContent is undefined', async () => {
    await onPasteDataMapper(mockApi, {
      targetVizNode: mockVizNode,
      originalContent: undefined,
      updatedContent: {} as IClipboardCopyObject,
    });

    expect(mockApi.getMetadata).not.toHaveBeenCalled();
  });

  it('should return early when updatedContent is undefined', async () => {
    await onPasteDataMapper(mockApi, {
      targetVizNode: mockVizNode,
      originalContent: {} as IClipboardCopyObject,
      updatedContent: undefined,
    });

    expect(mockApi.getMetadata).not.toHaveBeenCalled();
  });

  it('should return early when originalContent is not a DataMapper node', async () => {
    const originalContent: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: 'to',
      definition: {
        to: { uri: 'direct:test' },
      },
    };

    const updatedContent: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: 'to',
      definition: {
        to: { uri: 'direct:test' },
      },
    };

    await onPasteDataMapper(mockApi, {
      targetVizNode: mockVizNode,
      originalContent,
      updatedContent,
    });

    expect(mockApi.getMetadata).not.toHaveBeenCalled();
  });

  it('should return early when no DataMapper IDs are found', async () => {
    const originalContent: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: 'step',
      definition: {
        step: {
          steps: [{ to: { uri: 'direct:test' } }],
        },
      },
    };

    const updatedContent: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: 'step',
      definition: {
        step: {
          steps: [{ to: { uri: 'direct:test' } }],
        },
      },
    };

    await onPasteDataMapper(mockApi, {
      targetVizNode: mockVizNode,
      originalContent,
      updatedContent,
    });

    expect(mockApi.getMetadata).not.toHaveBeenCalled();
  });

  it('should create metadata and copy XSLT file for pasted DataMapper step', async () => {
    const originalMetadata: IDataMapperMetadata = {
      sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['source.xsd'] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['target.json'] },
      xsltPath: `${originalStepId}.xsl`,
    };

    const xsltContent = '<xsl:stylesheet>...</xsl:stylesheet>';

    mockApi.getMetadata.mockResolvedValue(originalMetadata);
    mockApi.getResourceContent.mockResolvedValue(xsltContent);

    const originalContent: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: originalStepId,
      definition: {
        id: originalStepId,
        steps: [{ to: { uri: 'xslt-saxon:original.xsl' } }],
      },
    };

    const updatedContent: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: newStepId,
      definition: {
        id: newStepId,
        steps: [{ to: { uri: 'xslt-saxon:new.xsl' } }],
      },
    };

    await onPasteDataMapper(mockApi, {
      targetVizNode: mockVizNode,
      originalContent,
      updatedContent,
    });

    expect(mockApi.getMetadata).toHaveBeenCalledWith(originalStepId);

    expect(mockApi.setMetadata).toHaveBeenCalledWith(
      newStepId,
      DataMapperMetadataService.cloneMetadata(originalMetadata, `${newStepId}.xsl`),
    );

    expect(mockApi.getResourceContent).toHaveBeenCalledWith(originalMetadata.xsltPath);

    expect(mockApi.saveResourceContent).toHaveBeenCalledWith(`${newStepId}.xsl`, xsltContent);

    const stepDef = updatedContent.definition as Record<string, unknown>;
    const steps = stepDef.steps as Array<Record<string, Record<string, unknown>>>;
    expect(steps[0].to.uri).toBe(`${XSLT_COMPONENT_NAME}:${newStepId}.xsl`);
  });

  it('should create empty metadata and update XSLT URI when original metadata is not found', async () => {
    mockApi.getMetadata.mockResolvedValue(undefined);

    const originalContent: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: originalStepId,
      definition: {
        id: originalStepId,
        steps: [{ to: { uri: `${XSLT_COMPONENT_NAME}:original.xsl` } }],
      },
    };

    const updatedContent: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: newStepId,
      definition: {
        id: newStepId,
        steps: [{ to: { uri: `${XSLT_COMPONENT_NAME}:new.xsl` } }],
      },
    };

    await onPasteDataMapper(mockApi, {
      targetVizNode: mockVizNode,
      originalContent,
      updatedContent,
    });

    expect(mockApi.setMetadata).toHaveBeenCalledWith(newStepId, DataMapperMetadataService.createMetadata());

    const stepDef = updatedContent.definition as Record<string, unknown>;
    const steps = stepDef.steps as Array<Record<string, Record<string, unknown>>>;
    expect(steps[0].to.uri).toBe(`${XSLT_COMPONENT_NAME}:`);
  });

  it('should handle missing XSLT content gracefully', async () => {
    const originalMetadata: IDataMapperMetadata = {
      sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      xsltPath: `${originalStepId}.xsl`,
    };

    mockApi.getMetadata.mockResolvedValue(originalMetadata);
    mockApi.getResourceContent.mockResolvedValue(undefined);

    const originalContent: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: originalStepId,
      definition: {
        id: originalStepId,
        steps: [{ to: { uri: 'xslt-saxon:test.xsl' } }],
      },
    };

    const updatedContent: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: newStepId,
      definition: {
        id: newStepId,
        steps: [{ to: { uri: 'xslt-saxon:test.xsl' } }],
      },
    };

    await onPasteDataMapper(mockApi, {
      targetVizNode: mockVizNode,
      originalContent,
      updatedContent,
    });

    expect(mockApi.setMetadata).toHaveBeenCalled();

    expect(mockApi.saveResourceContent).not.toHaveBeenCalled();
  });

  it('should handle multiple nested DataMapper steps', async () => {
    const originalMetadata1: IDataMapperMetadata = {
      sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['source1.xsd'] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['target1.json'] },
      xsltPath: 'kaoto-datamapper-original-id-1.xsl',
    };

    const originalMetadata2: IDataMapperMetadata = {
      sourceBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['source2.xsd'] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['target2.json'] },
      xsltPath: 'kaoto-datamapper-original-id-2.xsl',
    };

    mockApi.getMetadata.mockResolvedValueOnce(originalMetadata1).mockResolvedValueOnce(originalMetadata2);
    mockApi.getResourceContent
      .mockResolvedValueOnce('<xsl:stylesheet>1</xsl:stylesheet>')
      .mockResolvedValueOnce('<xsl:stylesheet>2</xsl:stylesheet>');

    const originalContent: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: 'choice',
      definition: {
        choice: {
          when: [
            {
              step: {
                id: 'kaoto-datamapper-original-id-1',
                steps: [{ to: { uri: 'xslt-saxon:test1.xsl' } }],
              },
            },
            {
              step: {
                id: 'kaoto-datamapper-original-id-2',
                steps: [{ to: { uri: 'xslt-saxon:test2.xsl' } }],
              },
            },
          ],
        },
      },
    };

    const updatedContent: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: 'choice',
      definition: {
        choice: {
          when: [
            {
              step: {
                id: 'kaoto-datamapper-new-id-1',
                steps: [{ to: { uri: 'xslt-saxon:test1.xsl' } }],
              },
            },
            {
              step: {
                id: 'kaoto-datamapper-new-id-2',
                steps: [{ to: { uri: 'xslt-saxon:test2.xsl' } }],
              },
            },
          ],
        },
      },
    };

    await onPasteDataMapper(mockApi, {
      targetVizNode: mockVizNode,
      originalContent,
      updatedContent,
    });

    expect(mockApi.getMetadata).toHaveBeenCalledTimes(2);
    expect(mockApi.getMetadata).toHaveBeenCalledWith('kaoto-datamapper-original-id-1');
    expect(mockApi.getMetadata).toHaveBeenCalledWith('kaoto-datamapper-original-id-2');

    expect(mockApi.setMetadata).toHaveBeenCalledTimes(2);
    expect(mockApi.setMetadata).toHaveBeenCalledWith(
      'kaoto-datamapper-new-id-1',
      DataMapperMetadataService.cloneMetadata(originalMetadata1, 'kaoto-datamapper-new-id-1.xsl'),
    );
    expect(mockApi.setMetadata).toHaveBeenCalledWith(
      'kaoto-datamapper-new-id-2',
      DataMapperMetadataService.cloneMetadata(originalMetadata2, 'kaoto-datamapper-new-id-2.xsl'),
    );

    expect(mockApi.saveResourceContent).toHaveBeenCalledTimes(2);

    const choiceDef = (updatedContent.definition as Record<string, Record<string, unknown[]>>).choice;
    const whenSteps = choiceDef.when;
    const step1 = (whenSteps[0] as Record<string, unknown>).step as Record<string, unknown>;
    const step2 = (whenSteps[1] as Record<string, unknown>).step as Record<string, unknown>;
    const steps1 = step1.steps as Array<Record<string, Record<string, unknown>>>;
    const steps2 = step2.steps as Array<Record<string, Record<string, unknown>>>;
    expect(steps1[0].to.uri).toBe(`${XSLT_COMPONENT_NAME}:kaoto-datamapper-new-id-1.xsl`);
    expect(steps2[0].to.uri).toBe(`${XSLT_COMPONENT_NAME}:kaoto-datamapper-new-id-2.xsl`);
  });
});
