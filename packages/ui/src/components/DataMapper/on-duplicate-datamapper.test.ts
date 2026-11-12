import type { Mocked } from 'vitest';

import { IVisualizationNode } from '../../models';
import { DocumentDefinitionType } from '../../models/datamapper';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { IClipboardContent } from '../../models/visualization/clipboard';
import { IMetadataApi } from '../../providers';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';
import {
  GENERATED_WRAPPER_MARKER,
  GENERATED_WRAPPER_NOTICE,
} from '../../services/document/xml-schema/xml-schema-wrapper-generator.service';
import { XSLT_COMPONENT_NAME } from '../../utils';
import { onDuplicateDataMapper } from './on-duplicate-datamapper';

describe('onDuplicateDataMapper', () => {
  let mockApi: Mocked<IMetadataApi>;
  let mockVizNode: Mocked<IVisualizationNode>;
  const originalMetadataId = 'kaoto-datamapper-original-id';
  const newStepId = 'kaoto-datamapper-new-id';

  beforeEach(() => {
    mockApi = {
      getMetadata: vi.fn(),
      setMetadata: vi.fn(),
      getResourceContent: vi.fn(),
      isResourceExist: vi.fn(),
      saveResourceContent: vi.fn(),
      deleteResource: vi.fn(),
      askUserForFileSelection: vi.fn(),
      shouldSaveSchema: true,
    } as unknown as Mocked<IMetadataApi>;

    mockApi.isResourceExist.mockImplementation(
      async (path: string) => (await mockApi.getResourceContent(path)) !== undefined,
    );

    mockVizNode = {} as Mocked<IVisualizationNode>;

    vi.spyOn(DataMapperStepService, 'getDataMapperMetadataId').mockReturnValue(originalMetadataId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    const content: IClipboardContent = {
      name: 'step',
      definition: {
        id: newStepId,
        steps: [{ to: { uri: `xslt-saxon:${originalMetadataId}.xsl` } }],
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
    const content: IClipboardContent = {
      name: 'step',
      definition: {},
    };

    await onDuplicateDataMapper(mockApi, { sourceVizNode: mockVizNode, content });

    expect(mockApi.setMetadata).not.toHaveBeenCalled();
  });

  it('should create empty metadata and set XSLT URI to empty when original metadata is not found', async () => {
    mockApi.getMetadata.mockResolvedValue(undefined);

    const content: IClipboardContent = {
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

    const content: IClipboardContent = {
      name: 'step',
      definition: {
        id: newStepId,
      },
    };

    await onDuplicateDataMapper(mockApi, { sourceVizNode: mockVizNode, content });

    expect(mockApi.setMetadata).toHaveBeenCalledTimes(1);
    expect(mockApi.setMetadata).toHaveBeenCalledWith(
      newStepId,
      expect.objectContaining({ xsltPath: `${newStepId}.xsl` }),
    );

    expect(mockApi.saveResourceContent).not.toHaveBeenCalled();
  });

  it('should copy the generated validation wrapper and point the validator to the copy', async () => {
    const originalMetadata: IDataMapperMetadata = {
      sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['a.xsd', 'b.xsd'] },
      xsltPath: `${originalMetadataId}.xsl`,
    };
    const wrapper = `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`;
    mockApi.getMetadata.mockResolvedValue(originalMetadata);
    mockApi.getResourceContent.mockImplementation((path: string) =>
      Promise.resolve(
        {
          [`${originalMetadataId}-validation-wrapper.xsd`]: wrapper,
          [`${originalMetadataId}.xsl`]: '<xsl:stylesheet/>',
        }[path],
      ),
    );

    const content: IClipboardContent = {
      name: 'step',
      definition: {
        id: newStepId,
        steps: [
          { to: { uri: `xslt-saxon:${originalMetadataId}.xsl` } },
          { to: { uri: `validator:${originalMetadataId}-validation-wrapper.xsd` } },
        ],
      },
    };

    await onDuplicateDataMapper(mockApi, { sourceVizNode: mockVizNode, content });

    expect(mockApi.saveResourceContent).toHaveBeenCalledWith(`${newStepId}-validation-wrapper.xsd`, wrapper);
    const steps = (content.definition as { steps: Array<{ to: { uri: string } }> }).steps;
    expect(steps[1].to.uri).toBe(`validator:${newStepId}-validation-wrapper.xsd`);
  });

  it('should not touch the validator when there is no wrapper to copy', async () => {
    const originalMetadata: IDataMapperMetadata = {
      sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['a.xsd'] },
      xsltPath: `${originalMetadataId}.xsl`,
    };
    mockApi.getMetadata.mockResolvedValue(originalMetadata);
    mockApi.getResourceContent.mockImplementation((path: string) =>
      Promise.resolve(path.endsWith('.xsl') ? '<xsl:stylesheet/>' : undefined),
    );

    const content: IClipboardContent = {
      name: 'step',
      definition: {
        id: newStepId,
        steps: [{ to: { uri: `xslt-saxon:${originalMetadataId}.xsl` } }, { to: { uri: 'validator:a.xsd' } }],
      },
    };

    await onDuplicateDataMapper(mockApi, { sourceVizNode: mockVizNode, content });

    const steps = (content.definition as { steps: Array<{ to: { uri: string } }> }).steps;
    expect(steps[1].to.uri).toBe('validator:a.xsd');
  });

  it('should keep the query options of the validator URI when pointing it to the copy', async () => {
    const originalMetadata: IDataMapperMetadata = {
      sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['a.xsd', 'b.xsd'] },
      xsltPath: `${originalMetadataId}.xsl`,
    };
    const wrapper = `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`;
    mockApi.getMetadata.mockResolvedValue(originalMetadata);
    mockApi.getResourceContent.mockImplementation((path: string) =>
      Promise.resolve(
        {
          [`${originalMetadataId}-validation-wrapper.xsd`]: wrapper,
          [`${originalMetadataId}.xsl`]: '<xsl:stylesheet/>',
        }[path],
      ),
    );
    const content: IClipboardContent = {
      name: 'step',
      definition: {
        id: newStepId,
        steps: [
          { to: { uri: `xslt-saxon:${originalMetadataId}.xsl` } },
          { to: { uri: `validator:${originalMetadataId}-validation-wrapper.xsd?failOnNullBody=false` } },
        ],
      },
    };

    await onDuplicateDataMapper(mockApi, { sourceVizNode: mockVizNode, content });

    const steps = (content.definition as { steps: Array<{ to: { uri: string } }> }).steps;
    expect(steps[1].to.uri).toBe(`validator:${newStepId}-validation-wrapper.xsd?failOnNullBody=false`);
  });

  it('should drop a validator that still points to the original wrapper when the wrapper could not be copied', async () => {
    const originalMetadata: IDataMapperMetadata = {
      sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['a.xsd', 'b.xsd'] },
      xsltPath: `${originalMetadataId}.xsl`,
    };
    mockApi.getMetadata.mockResolvedValue(originalMetadata);
    mockApi.getResourceContent.mockImplementation((path: string) =>
      Promise.resolve(path === `${originalMetadataId}.xsl` ? '<xsl:stylesheet/>' : undefined),
    );
    const content: IClipboardContent = {
      name: 'step',
      definition: {
        id: newStepId,
        steps: [
          { to: { uri: `xslt-saxon:${originalMetadataId}.xsl` } },
          { to: { uri: `validator:${originalMetadataId}-validation-wrapper.xsd` } },
        ],
      },
    };

    await onDuplicateDataMapper(mockApi, { sourceVizNode: mockVizNode, content });

    const steps = (content.definition as { steps: Array<{ to: { uri: string } }> }).steps;
    expect(steps).toHaveLength(1);
  });

  it('should warn, drop the validator of the copy and leave the original files alone when the wrapper copy fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const originalMetadata: IDataMapperMetadata = {
      sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['a.xsd', 'b.xsd'] },
      xsltPath: `${originalMetadataId}.xsl`,
    };
    const originalWrapper = `${originalMetadataId}-validation-wrapper.xsd`;
    const files: Record<string, string> = {
      [`${originalMetadataId}.xsl`]: '<xsl:stylesheet/>',
      [originalWrapper]: `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`,
    };
    mockApi.getMetadata.mockResolvedValue(originalMetadata);
    mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(files[path]));
    // The XSLT copy works, writing the wrapper copy does not
    mockApi.saveResourceContent.mockImplementation((path: string) =>
      path === `${newStepId}-validation-wrapper.xsd` ? Promise.reject(new Error('disk full')) : Promise.resolve(),
    );
    const content: IClipboardContent = {
      name: 'step',
      definition: {
        id: newStepId,
        steps: [
          { to: { uri: `xslt-saxon:${originalMetadataId}.xsl` } },
          { to: { uri: `validator:${originalWrapper}` } },
        ],
      },
    };

    await onDuplicateDataMapper(mockApi, { sourceVizNode: mockVizNode, content });

    const steps = (content.definition as { steps: Array<{ to: { uri: string } }> }).steps;
    expect(steps).toHaveLength(1);
    expect(steps[0].to.uri).toBe(`${XSLT_COMPONENT_NAME}:${newStepId}.xsl`);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('disk full'));
    // The original step keeps its files
    expect(mockApi.deleteResource).not.toHaveBeenCalled();
    expect(mockApi.saveResourceContent).not.toHaveBeenCalledWith(originalWrapper, expect.anything());
  });

  it('should not warn when the original has no wrapper at all', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockApi.getMetadata.mockResolvedValue({
      sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['a.xsd'] },
      xsltPath: `${originalMetadataId}.xsl`,
    });
    mockApi.getResourceContent.mockImplementation((path: string) =>
      Promise.resolve(path.endsWith('.xsl') ? '<xsl:stylesheet/>' : undefined),
    );

    await onDuplicateDataMapper(mockApi, {
      sourceVizNode: mockVizNode,
      content: {
        name: 'step',
        definition: { id: newStepId, steps: [{ to: { uri: `xslt-saxon:${originalMetadataId}.xsl` } }] },
      },
    });

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should drop a validator that points to the original wrapper when the original has no metadata', async () => {
    mockApi.getMetadata.mockResolvedValue(undefined);
    const content: IClipboardContent = {
      name: 'step',
      definition: {
        id: newStepId,
        steps: [
          { to: { uri: `xslt-saxon:${originalMetadataId}.xsl` } },
          { to: { uri: `validator:${originalMetadataId}-validation-wrapper.xsd` } },
        ],
      },
    };

    await onDuplicateDataMapper(mockApi, { sourceVizNode: mockVizNode, content });

    const steps = (content.definition as { steps: Array<{ to: { uri: string } }> }).steps;
    expect(steps).toHaveLength(1);
    expect(steps[0].to.uri).toBe(`${XSLT_COMPONENT_NAME}:`);
  });
});
