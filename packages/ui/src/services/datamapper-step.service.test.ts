import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind, createVisualizationNode, IVisualizationNode } from '../models';
import { CamelCatalogService } from '../models/visualization/flows/camel-catalog.service';
import { EntitiesContextResult } from '../providers';
import { XSLT_COMPONENT_NAME, XsltComponentDef } from '../utils';
import { DataMapperStepService } from './datamapper-step.service';

jest.mock('../models/visualization/flows/camel-catalog.service');

describe('DataMapperStepService', () => {
  let mockEntitiesContext: jest.Mocked<EntitiesContextResult>;

  beforeEach(() => {
    mockEntitiesContext = {
      updateSourceCodeFromEntities: jest.fn(),
    } as unknown as jest.Mocked<EntitiesContextResult>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDataMapperMetadataId', () => {
    it('should return the id from visualization node', () => {
      const vizNode = createVisualizationNode('custom-id', { catalogKind: CatalogKind.Processor, name: 'step' });
      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue({ id: 'custom-metadata-id' });

      const metadataId = DataMapperStepService.getDataMapperMetadataId(vizNode);

      expect(metadataId).toBe('custom-metadata-id');
    });
  });

  describe('initializeXsltStep', () => {
    let vizNode: IVisualizationNode;
    const metadataId = 'test-metadata-id';

    beforeEach(() => {
      vizNode = createVisualizationNode('test', { catalogKind: CatalogKind.Pattern, name: 'step' });
    });

    it('should initialize XSLT step with document name based on metadata ID', () => {
      const model = {
        id: 'step-id',
        steps: [
          {
            to: {
              uri: XSLT_COMPONENT_NAME,
            },
          } as ProcessorDefinition,
        ],
      };

      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      const documentName = DataMapperStepService.initializeXsltStep(vizNode, metadataId, mockEntitiesContext);

      expect(documentName).toBe('test-metadata-id.xsl');
      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
      const step = model.steps[0];
      if (step.to && typeof step.to === 'object' && 'uri' in step.to) {
        expect(step.to.uri).toBe(`${XSLT_COMPONENT_NAME}:test-metadata-id.xsl`);
      }
    });

    it('should always set URI even when already set', () => {
      const model = {
        id: 'step-id',
        steps: [
          {
            to: {
              uri: `${XSLT_COMPONENT_NAME}:existing.xsl`,
            },
          } as ProcessorDefinition,
        ],
      };

      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      const documentName = DataMapperStepService.initializeXsltStep(vizNode, metadataId, mockEntitiesContext);

      expect(documentName).toBe('test-metadata-id.xsl');
      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
      const step = model.steps[0];
      if (step.to && typeof step.to === 'object' && 'uri' in step.to) {
        expect(step.to.uri).toBe(`${XSLT_COMPONENT_NAME}:test-metadata-id.xsl`);
      }
    });
  });

  describe('getXSLTDocumentName', () => {
    it('should extract document name from XSLT step URI', () => {
      const xsltStep = {
        to: { uri: `${XSLT_COMPONENT_NAME}:transform.xsl` },
      };

      const documentName = DataMapperStepService.getXsltFileName(xsltStep);

      expect(documentName).toBe('transform.xsl');
    });

    it('should return undefined when xsltStep is undefined', () => {
      const documentName = DataMapperStepService.getXsltFileName();

      expect(documentName).toBeUndefined();
    });

    it('should return component name when URI is only component name without separator', () => {
      const xsltStep = {
        to: { uri: XSLT_COMPONENT_NAME },
      };

      const documentName = DataMapperStepService.getXsltFileName(xsltStep);

      expect(documentName).toBe(XSLT_COMPONENT_NAME);
    });

    it('should return empty string when URI has separator but no document name', () => {
      const xsltStep = {
        to: { uri: `${XSLT_COMPONENT_NAME}:` },
      };

      const documentName = DataMapperStepService.getXsltFileName(xsltStep);

      expect(documentName).toBe('');
    });

    it('should return undefined for null/undefined URI', () => {
      const xsltStep = {
        to: { uri: null },
      } as unknown as XsltComponentDef;

      const documentName = DataMapperStepService.getXsltFileName(xsltStep);

      expect(documentName).toBeUndefined();
    });
  });

  describe('supportsJsonBody', () => {
    it('should return true when useJsonBody parameter exists in catalog', () => {
      (CamelCatalogService.getComponent as jest.Mock).mockReturnValue({
        properties: {
          useJsonBody: {
            type: 'boolean',
            description: 'Use JSON body',
          },
        },
      });

      const result = DataMapperStepService.supportsJsonBody();

      expect(result).toBe(true);
      expect(CamelCatalogService.getComponent).toHaveBeenCalledWith(CatalogKind.Component, 'xslt-saxon');
    });

    it('should return false when useJsonBody parameter does not exist in catalog', () => {
      (CamelCatalogService.getComponent as jest.Mock).mockReturnValue({
        properties: {
          otherParam: {
            type: 'string',
          },
        },
      });

      const result = DataMapperStepService.supportsJsonBody();

      expect(result).toBe(false);
    });

    it('should return false when component is not found', () => {
      (CamelCatalogService.getComponent as jest.Mock).mockReturnValue(undefined);

      const result = DataMapperStepService.supportsJsonBody();

      expect(result).toBe(false);
    });

    it('should return false when component has no properties', () => {
      (CamelCatalogService.getComponent as jest.Mock).mockReturnValue({
        properties: undefined,
      });

      const result = DataMapperStepService.supportsJsonBody();

      expect(result).toBe(false);
    });
  });

  describe('setUseJsonBody', () => {
    let vizNode: IVisualizationNode;

    beforeEach(() => {
      vizNode = createVisualizationNode('test', { catalogKind: CatalogKind.Pattern, name: 'step' });
    });

    it('should set useJsonBody parameter when isUseJsonBody is true', () => {
      const model = {
        id: 'step-id',
        steps: [
          {
            to: {
              uri: `${XSLT_COMPONENT_NAME}:test.xsl`,
              parameters: {},
            },
          } as ProcessorDefinition,
        ],
      };

      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      DataMapperStepService.setUseJsonBody(vizNode, true, mockEntitiesContext);

      expect(updateModelSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          steps: [
            expect.objectContaining({
              to: expect.objectContaining({
                parameters: {
                  useJsonBody: true,
                },
              }),
            }),
          ],
        }),
      );
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
    });

    it('should remove useJsonBody parameter when isUseJsonBody is false', () => {
      const model = {
        id: 'step-id',
        steps: [
          {
            to: {
              uri: `${XSLT_COMPONENT_NAME}:test.xsl`,
              parameters: {
                useJsonBody: true,
              },
            },
          } as ProcessorDefinition,
        ],
      };

      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      DataMapperStepService.setUseJsonBody(vizNode, false, mockEntitiesContext);

      expect(updateModelSpy).toHaveBeenCalled();
      const updatedModel = updateModelSpy.mock.calls[0][0] as typeof model;
      const xsltStep = updatedModel.steps[0];
      if (xsltStep.to && typeof xsltStep.to === 'object' && 'parameters' in xsltStep.to) {
        expect((xsltStep.to as { parameters?: Record<string, unknown> }).parameters?.useJsonBody).toBeUndefined();
      }
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
    });

    it('should create parameters object if it does not exist', () => {
      const model = {
        id: 'step-id',
        steps: [
          {
            to: {
              uri: `${XSLT_COMPONENT_NAME}:test.xsl`,
            },
          } as ProcessorDefinition,
        ],
      };

      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      DataMapperStepService.setUseJsonBody(vizNode, true, mockEntitiesContext);

      expect(updateModelSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          steps: [
            expect.objectContaining({
              to: expect.objectContaining({
                parameters: {
                  useJsonBody: true,
                },
              }),
            }),
          ],
        }),
      );
    });

    it('should not update when XSLT step is not found', () => {
      const model = {
        id: 'step-id',
        steps: [
          {
            to: {
              uri: 'direct:test',
            },
          } as ProcessorDefinition,
        ],
      };

      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      DataMapperStepService.setUseJsonBody(vizNode, true, mockEntitiesContext);

      expect(updateModelSpy).not.toHaveBeenCalled();
      expect(mockEntitiesContext.updateSourceCodeFromEntities).not.toHaveBeenCalled();
    });

    it('should not update when to is not an object', () => {
      const model = {
        id: 'step-id',
        steps: [
          {
            to: 'string-value',
          } as ProcessorDefinition,
        ],
      };

      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      DataMapperStepService.setUseJsonBody(vizNode, true, mockEntitiesContext);

      expect(updateModelSpy).not.toHaveBeenCalled();
      expect(mockEntitiesContext.updateSourceCodeFromEntities).not.toHaveBeenCalled();
    });
  });
});
