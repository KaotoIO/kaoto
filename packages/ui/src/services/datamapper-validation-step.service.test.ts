import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { createVisualizationNode } from '../models';
import { DocumentDefinitionType } from '../models/datamapper/document';
import { IDocumentMetadata } from '../models/datamapper/metadata';
import { EntitiesContextResult } from '../providers';
import { DataMapperValidationStepService } from './datamapper-validation-step.service';

describe('DataMapperValidationStepService', () => {
  let mockEntitiesContext: Mocked<EntitiesContextResult>;

  const xmlMetadata = { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['ShipOrder.xsd'] } as IDocumentMetadata;
  const jsonMetadata = { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['schema.json'] } as IDocumentMetadata;
  const primitiveMetadata = { type: DocumentDefinitionType.Primitive, filePath: [] } as IDocumentMetadata;
  const emptyFilePathMetadata = { type: DocumentDefinitionType.XML_SCHEMA, filePath: [] } as IDocumentMetadata;

  const createModel = (...stepUris: string[]) => ({
    id: 'step-id',
    steps: stepUris.map((uri) => ({ to: { uri } }) as ProcessorDefinition),
  });

  const createVizNode = (model: ReturnType<typeof createModel>) =>
    createVisualizationNode('test', {
      name: 'step',
      isPlaceholder: false,
      isGroup: false,
      title: '',
      description: '',
      iconUrl: '',
      definition: model,
    });

  beforeEach(() => {
    mockEntitiesContext = {
      updateSourceCodeFromEntities: vi.fn(),
    } as unknown as Mocked<EntitiesContextResult>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getValidationStep', () => {
    it('should return undefined when only XSLT step is present', () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);

      expect(DataMapperValidationStepService.getValidationStep(vizNode)).toBeUndefined();
    });

    it('should return the validator step when present', () => {
      const model = createModel('xslt-saxon:transform.xsl', 'validator:ShipOrder.xsd');
      const vizNode = createVizNode(model);

      const result = DataMapperValidationStepService.getValidationStep(vizNode);
      expect(result).toBeDefined();
      expect(result!.to.uri).toBe('validator:ShipOrder.xsd');
    });

    it('should return the json-validator step when present', () => {
      const model = createModel('xslt-saxon:transform.xsl', 'json-validator:schema.json');
      const vizNode = createVizNode(model);

      const result = DataMapperValidationStepService.getValidationStep(vizNode);
      expect(result).toBeDefined();
      expect(result!.to.uri).toBe('json-validator:schema.json');
    });
  });

  describe('isValidationEnabled', () => {
    it('should return false when no validator step is present', () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);

      expect(DataMapperValidationStepService.isValidationEnabled(vizNode)).toBe(false);
    });

    it('should return true when validator step is present', () => {
      const model = createModel('xslt-saxon:transform.xsl', 'validator:ShipOrder.xsd');
      const vizNode = createVizNode(model);

      expect(DataMapperValidationStepService.isValidationEnabled(vizNode)).toBe(true);
    });

    it('should return true when json-validator step is present', () => {
      const model = createModel('xslt-saxon:transform.xsl', 'json-validator:schema.json');
      const vizNode = createVizNode(model);

      expect(DataMapperValidationStepService.isValidationEnabled(vizNode)).toBe(true);
    });
  });

  describe('addValidationStep', () => {
    it('should add validator step for XML_SCHEMA target', () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');

      DataMapperValidationStepService.addValidationStep(vizNode, xmlMetadata, mockEntitiesContext);

      expect(model.steps).toHaveLength(2);
      expect((model.steps[1] as ProcessorDefinition).to).toMatchObject({ uri: 'validator:ShipOrder.xsd' });
      expect((model.steps[0] as ProcessorDefinition).to).toMatchObject({ uri: 'xslt-saxon:transform.xsl' });
      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
    });

    it('should add json-validator step for JSON_SCHEMA target', () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');

      DataMapperValidationStepService.addValidationStep(vizNode, jsonMetadata, mockEntitiesContext);

      expect(model.steps).toHaveLength(2);
      expect((model.steps[1] as ProcessorDefinition).to).toMatchObject({ uri: 'json-validator:schema.json' });
      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
    });

    it('should generate step ID starting with kaoto-datamapper-validator- for XML target', () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);

      DataMapperValidationStepService.addValidationStep(vizNode, xmlMetadata, mockEntitiesContext);

      const addedStep = model.steps[1] as { to: { id: string; uri: string } };
      expect(addedStep.to.id).toMatch(/^kaoto-datamapper-validator-/);
    });

    it('should generate step ID starting with kaoto-datamapper-json-validator- for JSON target', () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);

      DataMapperValidationStepService.addValidationStep(vizNode, jsonMetadata, mockEntitiesContext);

      const addedStep = model.steps[1] as { to: { id: string; uri: string } };
      expect(addedStep.to.id).toMatch(/^kaoto-datamapper-json-validator-/);
    });

    it('should do nothing for Primitive target', () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');

      DataMapperValidationStepService.addValidationStep(vizNode, primitiveMetadata, mockEntitiesContext);

      expect(model.steps).toHaveLength(1);
      expect(updateModelSpy).not.toHaveBeenCalled();
      expect(mockEntitiesContext.updateSourceCodeFromEntities).not.toHaveBeenCalled();
    });

    it('should do nothing when filePath is empty', () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');

      DataMapperValidationStepService.addValidationStep(vizNode, emptyFilePathMetadata, mockEntitiesContext);

      expect(model.steps).toHaveLength(1);
      expect(updateModelSpy).not.toHaveBeenCalled();
      expect(mockEntitiesContext.updateSourceCodeFromEntities).not.toHaveBeenCalled();
    });
  });

  describe('removeValidationStep', () => {
    it('should remove validator step and preserve XSLT step', () => {
      const model = createModel('xslt-saxon:transform.xsl', 'validator:ShipOrder.xsd');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');

      DataMapperValidationStepService.removeValidationStep(vizNode, mockEntitiesContext);

      expect(model.steps).toHaveLength(1);
      expect((model.steps[0] as ProcessorDefinition).to).toMatchObject({ uri: 'xslt-saxon:transform.xsl' });
      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
    });

    it('should remove json-validator step and preserve XSLT step', () => {
      const model = createModel('xslt-saxon:transform.xsl', 'json-validator:schema.json');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');

      DataMapperValidationStepService.removeValidationStep(vizNode, mockEntitiesContext);

      expect(model.steps).toHaveLength(1);
      expect((model.steps[0] as ProcessorDefinition).to).toMatchObject({ uri: 'xslt-saxon:transform.xsl' });
      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
    });

    it('should do nothing when no validator step is present', () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');

      DataMapperValidationStepService.removeValidationStep(vizNode, mockEntitiesContext);

      expect(model.steps).toHaveLength(1);
      expect(updateModelSpy).not.toHaveBeenCalled();
      expect(mockEntitiesContext.updateSourceCodeFromEntities).not.toHaveBeenCalled();
    });
  });

  describe('updateValidationStep', () => {
    it('should update URI when file changes for same type (XML)', () => {
      const model = createModel('xslt-saxon:transform.xsl', 'validator:Old.xsd');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');
      const newMetadata = { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['New.xsd'] } as IDocumentMetadata;

      DataMapperValidationStepService.updateValidationStep(vizNode, newMetadata, mockEntitiesContext);

      expect((model.steps[1] as ProcessorDefinition).to).toMatchObject({ uri: 'validator:New.xsd' });
      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalledTimes(1);
    });

    it('should update URI when file changes for same type (JSON)', () => {
      const model = createModel('xslt-saxon:transform.xsl', 'json-validator:old-schema.json');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');
      const newMetadata = {
        type: DocumentDefinitionType.JSON_SCHEMA,
        filePath: ['new-schema.json'],
      } as IDocumentMetadata;

      DataMapperValidationStepService.updateValidationStep(vizNode, newMetadata, mockEntitiesContext);

      expect((model.steps[1] as ProcessorDefinition).to).toMatchObject({ uri: 'json-validator:new-schema.json' });
      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalledTimes(1);
    });

    it('should replace step in place when type changes from XML to JSON', () => {
      const model = createModel('xslt-saxon:transform.xsl', 'validator:ShipOrder.xsd');
      const vizNode = createVizNode(model);

      DataMapperValidationStepService.updateValidationStep(vizNode, jsonMetadata, mockEntitiesContext);

      expect(model.steps).toHaveLength(2);
      expect((model.steps[1] as ProcessorDefinition).to).toMatchObject({ uri: 'json-validator:schema.json' });
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalledTimes(1);
    });

    it('should replace step in place when type changes from JSON to XML', () => {
      const model = createModel('xslt-saxon:transform.xsl', 'json-validator:schema.json');
      const vizNode = createVizNode(model);

      DataMapperValidationStepService.updateValidationStep(vizNode, xmlMetadata, mockEntitiesContext);

      expect(model.steps).toHaveLength(2);
      expect((model.steps[1] as ProcessorDefinition).to).toMatchObject({ uri: 'validator:ShipOrder.xsd' });
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalledTimes(1);
    });

    it('should remove step when target becomes Primitive', () => {
      const model = createModel('xslt-saxon:transform.xsl', 'validator:ShipOrder.xsd');
      const vizNode = createVizNode(model);

      DataMapperValidationStepService.updateValidationStep(vizNode, primitiveMetadata, mockEntitiesContext);

      expect(model.steps).toHaveLength(1);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalledTimes(1);
    });

    it('should do nothing when no existing validator step', () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');

      DataMapperValidationStepService.updateValidationStep(vizNode, xmlMetadata, mockEntitiesContext);

      expect(updateModelSpy).not.toHaveBeenCalled();
      expect(mockEntitiesContext.updateSourceCodeFromEntities).not.toHaveBeenCalled();
    });
  });
});
