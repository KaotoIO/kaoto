import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind, createVisualizationNode, IVisualizationNode } from '../models';
import { MappingTree, ValueSelector } from '../models/datamapper/mapping';
import { DocumentDefinitionType, DocumentType } from '../models/datamapper/document';
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
      const vizNode = createVisualizationNode('custom-id', {
        name: 'step',
        isPlaceholder: false,
        isGroup: false,
        title: '',
        description: '',
        iconUrl: '',
      });
      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue({ id: 'custom-metadata-id' });

      const metadataId = DataMapperStepService.getDataMapperMetadataId(vizNode);

      expect(metadataId).toBe('custom-metadata-id');
    });
  });

  describe('initializeXsltStep', () => {
    let vizNode: IVisualizationNode;
    const metadataId = 'test-metadata-id';

    beforeEach(() => {
      vizNode = createVisualizationNode('test', {
        name: 'step',
        isPlaceholder: false,
        isGroup: false,
        title: '',
        description: '',
        iconUrl: '',
      });
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
      vizNode = createVisualizationNode('test', {
        name: 'step',
        isPlaceholder: false,
        isGroup: false,
        title: '',
        description: '',
        iconUrl: '',
      });
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
  describe('isSourceBodyUsed', () => {
    it('should return false for an empty mapping tree', () => {
      const tree = new MappingTree(DocumentType.TARGET_BODY, 'Body', DocumentDefinitionType.Primitive);
      expect(DataMapperStepService.isSourceBodyUsed(tree)).toBe(false);
    });

    it('should return false when all expressions reference parameters (have documentReferenceName)', () => {
      const tree = new MappingTree(DocumentType.TARGET_BODY, 'Body', DocumentDefinitionType.XML_SCHEMA);
      const selector = new ValueSelector(tree);
      selector.expression = '$myParam/field';
      tree.children.push(selector);
      expect(DataMapperStepService.isSourceBodyUsed(tree)).toBe(false);
    });

    it('should return true when an expression references the source body (no documentReferenceName)', () => {
      const tree = new MappingTree(DocumentType.TARGET_BODY, 'Body', DocumentDefinitionType.XML_SCHEMA);
      const selector = new ValueSelector(tree);
      selector.expression = '/rootElement/field';
      tree.children.push(selector);
      expect(DataMapperStepService.isSourceBodyUsed(tree)).toBe(true);
    });
  });

  describe('syncSetBodyNullStep', () => {
    let vizNode: IVisualizationNode;

    beforeEach(() => {
      vizNode = createVisualizationNode('test', {
        name: 'step',
        isPlaceholder: false,
        isGroup: false,
        title: '',
        description: '',
        iconUrl: '',
      });
    });

    it('should insert setBody with empty constant at index 0 when body is not used and no managed setBody exists', () => {
      const model = {
        id: 'step-id',
        steps: [{ to: { uri: `${XSLT_COMPONENT_NAME}:test.xsl` } } as ProcessorDefinition],
      };
      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      DataMapperStepService.syncSetBodyNullStep(vizNode, false, mockEntitiesContext);

      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
      expect(model.steps).toHaveLength(2);
      expect((model.steps[0] as any).setBody).toBeDefined();
      expect((model.steps[0] as any).setBody.expression.constant).toEqual('');
    });

    it('should not insert setBody(null) when body is used', () => {
      const model = {
        id: 'step-id',
        steps: [{ to: { uri: `${XSLT_COMPONENT_NAME}:test.xsl` } } as ProcessorDefinition],
      };
      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      DataMapperStepService.syncSetBodyNullStep(vizNode, true, mockEntitiesContext);

      expect(updateModelSpy).not.toHaveBeenCalled();
      expect(model.steps).toHaveLength(1);
    });

    it('should remove setBody(null) when body becomes used', () => {
      const model = {
        id: 'step-id',
        steps: [
          { setBody: { id: 'set-body-id', expression: { constant: null } } } as any,
          { to: { uri: `${XSLT_COMPONENT_NAME}:test.xsl` } } as ProcessorDefinition,
        ],
      };
      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      DataMapperStepService.syncSetBodyNullStep(vizNode, true, mockEntitiesContext);

      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
      expect(model.steps).toHaveLength(1);
      expect((model.steps[0] as any).to).toBeDefined();
    });

    it('should remove setBody with empty constant when body becomes used', () => {
      const model = {
        id: 'step-id',
        steps: [
          { setBody: { id: 'set-body-id', expression: { constant: '' } } } as any,
          { to: { uri: `${XSLT_COMPONENT_NAME}:test.xsl` } } as ProcessorDefinition,
        ],
      };
      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      DataMapperStepService.syncSetBodyNullStep(vizNode, true, mockEntitiesContext);

      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
      expect(model.steps).toHaveLength(1);
      expect((model.steps[0] as any).to).toBeDefined();
    });

    it('should not remove a non-null setBody step when body becomes used', () => {
      const model = {
        id: 'step-id',
        steps: [
          { setBody: { id: 'set-body-id', expression: { simple: { expression: '${body}' } } } } as any,
          { to: { uri: `${XSLT_COMPONENT_NAME}:test.xsl` } } as ProcessorDefinition,
        ],
      };
      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      DataMapperStepService.syncSetBodyNullStep(vizNode, true, mockEntitiesContext);

      expect(updateModelSpy).not.toHaveBeenCalled();
      expect(model.steps).toHaveLength(2);
    });

    it('should not duplicate managed setBody when it already exists', () => {
      const model = {
        id: 'step-id',
        steps: [
          { setBody: { id: 'set-body-id', expression: { constant: null } } } as any,
          { to: { uri: `${XSLT_COMPONENT_NAME}:test.xsl` } } as ProcessorDefinition,
        ],
      };
      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      DataMapperStepService.syncSetBodyNullStep(vizNode, false, mockEntitiesContext);

      expect(updateModelSpy).not.toHaveBeenCalled();
      expect(model.steps).toHaveLength(2);
    });

    it('should normalize an existing non-managed setBody step to empty constant instead of adding another one', () => {
      const model = {
        id: 'step-id',
        steps: [
          { setBody: { id: 'set-body-id', expression: { simple: { expression: '${body}' } } } } as any,
          { to: { uri: `${XSLT_COMPONENT_NAME}:test.xsl` } } as ProcessorDefinition,
        ],
      };
      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      DataMapperStepService.syncSetBodyNullStep(vizNode, false, mockEntitiesContext);

      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
      expect(model.steps).toHaveLength(2);
      expect((model.steps[0] as any).setBody.expression.constant).toEqual('');
    });

    it('should do nothing when steps is undefined', () => {
      const model = { id: 'step-id' };
      jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(model);
      const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

      DataMapperStepService.syncSetBodyNullStep(vizNode, false, mockEntitiesContext);

      expect(updateModelSpy).not.toHaveBeenCalled();
    });
  });
});
