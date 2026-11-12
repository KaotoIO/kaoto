import type { Mocked } from 'vitest';

import { IVisualizationNode } from '../../models';
import { DocumentDefinitionType } from '../../models/datamapper';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { IClipboardContent } from '../../models/visualization/clipboard';
import { IMetadataApi } from '../../providers';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import {
  GENERATED_WRAPPER_MARKER,
  GENERATED_WRAPPER_NOTICE,
} from '../../services/document/xml-schema/xml-schema-wrapper-generator.service';
import { XSLT_COMPONENT_NAME } from '../../utils';
import { onPasteDataMapper } from './on-paste-data-mapper';

describe('onPasteDataMapper', () => {
  let mockApi: Mocked<IMetadataApi>;
  let mockVizNode: Mocked<IVisualizationNode>;
  const originalStepId = 'kaoto-datamapper-original-id';
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

    mockVizNode = {} as Mocked<IVisualizationNode>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return early when originalContent is undefined', async () => {
    await onPasteDataMapper(mockApi, {
      targetVizNode: mockVizNode,
      originalContent: undefined,
      updatedContent: {} as IClipboardContent,
    });

    expect(mockApi.getMetadata).not.toHaveBeenCalled();
  });

  it('should return early when updatedContent is undefined', async () => {
    await onPasteDataMapper(mockApi, {
      targetVizNode: mockVizNode,
      originalContent: {} as IClipboardContent,
      updatedContent: undefined,
    });

    expect(mockApi.getMetadata).not.toHaveBeenCalled();
  });

  it('should return early when originalContent is not a DataMapper node', async () => {
    const originalContent: IClipboardContent = {
      name: 'to',
      definition: {
        to: { uri: 'direct:test' },
      },
    };

    const updatedContent: IClipboardContent = {
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
    const originalContent: IClipboardContent = {
      name: 'step',
      definition: {
        step: {
          steps: [{ to: { uri: 'direct:test' } }],
        },
      },
    };

    const updatedContent: IClipboardContent = {
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

    const originalContent: IClipboardContent = {
      name: originalStepId,
      definition: {
        id: originalStepId,
        steps: [{ to: { uri: `xslt-saxon:${originalStepId}.xsl` } }],
      },
    };

    const updatedContent: IClipboardContent = {
      name: newStepId,
      definition: {
        id: newStepId,
        steps: [{ to: { uri: `xslt-saxon:${originalStepId}.xsl` } }],
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

    const originalContent: IClipboardContent = {
      name: originalStepId,
      definition: {
        id: originalStepId,
        steps: [{ to: { uri: `${XSLT_COMPONENT_NAME}:original.xsl` } }],
      },
    };

    const updatedContent: IClipboardContent = {
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

    const originalContent: IClipboardContent = {
      name: originalStepId,
      definition: {
        id: originalStepId,
        steps: [{ to: { uri: `xslt-saxon:${originalStepId}.xsl` } }],
      },
    };

    const updatedContent: IClipboardContent = {
      name: newStepId,
      definition: {
        id: newStepId,
        steps: [{ to: { uri: `xslt-saxon:${originalStepId}.xsl` } }],
      },
    };

    await onPasteDataMapper(mockApi, {
      targetVizNode: mockVizNode,
      originalContent,
      updatedContent,
    });

    expect(mockApi.setMetadata).toHaveBeenCalledTimes(1);
    expect(mockApi.setMetadata).toHaveBeenCalledWith(
      newStepId,
      expect.objectContaining({ xsltPath: `${newStepId}.xsl` }),
    );

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
    const xsltContents: Record<string, string> = {};
    xsltContents[originalMetadata1.xsltPath] = '<xsl:stylesheet>1</xsl:stylesheet>';
    xsltContents[originalMetadata2.xsltPath] = '<xsl:stylesheet>2</xsl:stylesheet>';
    mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(xsltContents[path]));

    const originalContent: IClipboardContent = {
      name: 'choice',
      definition: {
        choice: {
          when: [
            {
              step: {
                id: 'kaoto-datamapper-original-id-1',
                steps: [{ to: { uri: 'xslt-saxon:kaoto-datamapper-original-id-1.xsl' } }],
              },
            },
            {
              step: {
                id: 'kaoto-datamapper-original-id-2',
                steps: [{ to: { uri: 'xslt-saxon:kaoto-datamapper-original-id-2.xsl' } }],
              },
            },
          ],
        },
      },
    };

    const updatedContent: IClipboardContent = {
      name: 'choice',
      definition: {
        choice: {
          when: [
            {
              step: {
                id: 'kaoto-datamapper-new-id-1',
                steps: [{ to: { uri: 'xslt-saxon:kaoto-datamapper-original-id-1.xsl' } }],
              },
            },
            {
              step: {
                id: 'kaoto-datamapper-new-id-2',
                steps: [{ to: { uri: 'xslt-saxon:kaoto-datamapper-original-id-2.xsl' } }],
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

  describe('validation wrapper', () => {
    const wrapper = `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`;
    const originalMetadata: IDataMapperMetadata = {
      sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['a.xsd', 'b.xsd'] },
      xsltPath: `${originalStepId}.xsl`,
    };
    const originalWrapper = `${originalStepId}-validation-wrapper.xsd`;
    const newWrapper = `${newStepId}-validation-wrapper.xsd`;

    // A pasted copy still carries the XSLT file of the original step.
    const stepContent = (id: string, validatorUri: string): IClipboardContent => ({
      name: id,
      definition: {
        id,
        steps: [{ to: { uri: `${XSLT_COMPONENT_NAME}:${originalStepId}.xsl` } }, { to: { uri: validatorUri } }],
      },
    });

    const validatorUriOf = (content: IClipboardContent) =>
      (content.definition as { steps: Array<{ to: { uri: string } }> }).steps[1]?.to.uri;

    beforeEach(() => {
      mockApi.getMetadata.mockResolvedValue(originalMetadata);
      mockApi.isResourceExist.mockImplementation(
        async (path) => (await mockApi.getResourceContent(path)) !== undefined,
      );
    });

    it('should copy the wrapper and point the validator of the pasted step to the copy', async () => {
      const files: Record<string, string> = { [`${originalStepId}.xsl`]: '<xsl/>', [originalWrapper]: wrapper };
      mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(files[path]));
      const updatedContent = stepContent(newStepId, `validator:${originalWrapper}?failOnNullBody=false`);

      await onPasteDataMapper(mockApi, {
        targetVizNode: mockVizNode,
        originalContent: stepContent(originalStepId, `validator:${originalWrapper}`),
        updatedContent,
      });

      expect(mockApi.saveResourceContent).toHaveBeenCalledWith(newWrapper, wrapper);
      expect(validatorUriOf(updatedContent)).toBe(`validator:${newWrapper}?failOnNullBody=false`);
    });

    it('should warn, drop the validator of the pasted step and leave the original files alone when the wrapper copy fails', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const files: Record<string, string> = { [`${originalStepId}.xsl`]: '<xsl/>', [originalWrapper]: wrapper };
      mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(files[path]));
      mockApi.saveResourceContent.mockImplementation((path: string) =>
        path === newWrapper ? Promise.reject(new Error('disk full')) : Promise.resolve(),
      );
      const updatedContent = stepContent(newStepId, `validator:${originalWrapper}`);

      await onPasteDataMapper(mockApi, {
        targetVizNode: mockVizNode,
        originalContent: stepContent(originalStepId, `validator:${originalWrapper}`),
        updatedContent,
      });

      expect(validatorUriOf(updatedContent)).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('disk full'));
      expect(mockApi.deleteResource).not.toHaveBeenCalled();
      expect(mockApi.saveResourceContent).not.toHaveBeenCalledWith(originalWrapper, expect.anything());
    });

    it('should drop the validator when the original wrapper is gone (copy, delete the original, paste)', async () => {
      mockApi.getResourceContent.mockImplementation((path: string) =>
        Promise.resolve(path === `${originalStepId}.xsl` ? '<xsl/>' : undefined),
      );
      const updatedContent = stepContent(newStepId, `validator:${originalWrapper}`);

      await onPasteDataMapper(mockApi, {
        targetVizNode: mockVizNode,
        originalContent: stepContent(originalStepId, `validator:${originalWrapper}`),
        updatedContent,
      });

      expect(mockApi.saveResourceContent).not.toHaveBeenCalledWith(newWrapper, expect.anything());
      expect(validatorUriOf(updatedContent)).toBeUndefined();
    });

    it('should repoint the XSLT step and drop the stale validator when the original was renamed after the copy', async () => {
      const renamedMetadata = { ...originalMetadata, xsltPath: 'renamed.xsl' };
      const renamedWrapper = 'renamed-validation-wrapper.xsd';
      mockApi.getMetadata.mockResolvedValue(renamedMetadata);
      const files: Record<string, string> = { 'renamed.xsl': '<xsl/>', [renamedWrapper]: wrapper };
      mockApi.getResourceContent.mockImplementation((path: string) => Promise.resolve(files[path]));
      // The clipboard still holds the definition as it was copied, before the rename
      const updatedContent = stepContent(newStepId, `validator:${originalWrapper}?failOnNullBody=false`);

      await onPasteDataMapper(mockApi, {
        targetVizNode: mockVizNode,
        originalContent: stepContent(originalStepId, `validator:${originalWrapper}`),
        updatedContent,
      });

      const steps = (updatedContent.definition as { steps: Array<{ to: { uri: string } }> }).steps;
      expect(steps[0].to.uri).toBe(`${XSLT_COMPONENT_NAME}:${newStepId}.xsl`);
      expect(mockApi.saveResourceContent).toHaveBeenCalledWith(newWrapper, wrapper);
      expect(validatorUriOf(updatedContent)).toBeUndefined();
    });

    it('should drop the validator when the original has no metadata', async () => {
      mockApi.getMetadata.mockResolvedValue(undefined);
      // A pasted copy still carries the XSLT file of the original step.
      const updatedContent = stepContent(originalStepId, `validator:${originalWrapper}`);
      (updatedContent.definition as { id: string }).id = newStepId;

      await onPasteDataMapper(mockApi, {
        targetVizNode: mockVizNode,
        originalContent: stepContent(originalStepId, `validator:${originalWrapper}`),
        updatedContent,
      });

      expect(validatorUriOf(updatedContent)).toBeUndefined();
    });

    it('should keep a validator that points to a user schema', async () => {
      mockApi.getResourceContent.mockImplementation((path: string) =>
        Promise.resolve(path === `${originalStepId}.xsl` ? '<xsl/>' : undefined),
      );
      const updatedContent = stepContent(newStepId, 'validator:a.xsd');

      await onPasteDataMapper(mockApi, {
        targetVizNode: mockVizNode,
        originalContent: stepContent(originalStepId, 'validator:a.xsd'),
        updatedContent,
      });

      expect(validatorUriOf(updatedContent)).toBe('validator:a.xsd');
    });
  });
});
