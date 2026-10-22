/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import type { Mocked } from 'vitest';

import { createVisualizationNode } from '../models';
import { DocumentDefinitionType } from '../models/datamapper/document';
import { IDocumentMetadata } from '../models/datamapper/metadata';
import { EntitiesContextResult, IMetadataApi } from '../providers';
import { DataMapperValidationStepService } from './datamapper-validation-step.service';

describe('DataMapperValidationStepService', () => {
  let mockEntitiesContext: Mocked<EntitiesContextResult>;
  let mockApi: Mocked<IMetadataApi>;

  const xmlMetadata = { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['ShipOrder.xsd'] } as IDocumentMetadata;
  const jsonMetadata = { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['schema.json'] } as IDocumentMetadata;
  const primitiveMetadata = { type: DocumentDefinitionType.Primitive, filePath: [] } as IDocumentMetadata;
  const emptyFilePathMetadata = { type: DocumentDefinitionType.XML_SCHEMA, filePath: [] } as IDocumentMetadata;

  const createModel = (...stepUris: string[]) => ({
    id: 'step-id',
    steps: stepUris.map((uri) => ({ to: { uri } }) as ProcessorDefinition),
  });

  const createVizNode = (model: any) =>
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

    mockApi = {
      getResourceContent: vi.fn().mockResolvedValue(''),
      isResourceExist: vi.fn().mockResolvedValue(true),
      saveResourceContent: vi.fn().mockResolvedValue(undefined),
      deleteResource: vi.fn().mockResolvedValue(true),
    } as unknown as Mocked<IMetadataApi>;
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
    it('should add validator step for XML_SCHEMA target', async () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');

      await DataMapperValidationStepService.addValidationStep(
        vizNode,
        xmlMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        {},
      );

      expect(model.steps).toHaveLength(2);
      expect((model.steps[1] as ProcessorDefinition).to).toMatchObject({ uri: 'validator:ShipOrder.xsd' });
      expect((model.steps[0] as ProcessorDefinition).to).toMatchObject({ uri: 'xslt-saxon:transform.xsl' });
      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
    });

    it('should insert the validator before an existing output variable step', async () => {
      const model = createModel('xslt-saxon:transform.xsl');
      model.steps.push({
        setVariable: { id: 'kaoto-datamapper-output-variable-abc123', name: 'myVar', simple: '${body}' },
      } as unknown as (typeof model.steps)[number]);
      const vizNode = createVizNode(model);

      await DataMapperValidationStepService.addValidationStep(
        vizNode,
        xmlMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        {},
      );

      expect(model.steps).toHaveLength(3);
      expect((model.steps[0] as ProcessorDefinition).to).toMatchObject({ uri: 'xslt-saxon:transform.xsl' });
      expect((model.steps[1] as ProcessorDefinition).to).toMatchObject({ uri: 'validator:ShipOrder.xsd' });
      expect((model.steps[2] as ProcessorDefinition).setVariable).toBeDefined();
    });

    it('should add json-validator step for JSON_SCHEMA target', async () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');

      await DataMapperValidationStepService.addValidationStep(
        vizNode,
        jsonMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        {},
      );

      expect(model.steps).toHaveLength(2);
      expect((model.steps[1] as ProcessorDefinition).to).toMatchObject({ uri: 'json-validator:schema.json' });
      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
    });

    it('should generate step ID starting with kaoto-datamapper-validator- for XML target', async () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);

      await DataMapperValidationStepService.addValidationStep(
        vizNode,
        xmlMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        {},
      );

      const addedStep = model.steps[1] as { to: { id: string; uri: string } };
      expect(addedStep.to.id).toMatch(/^kaoto-datamapper-validator-/);
    });

    it('should generate step ID starting with kaoto-datamapper-json-validator- for JSON target', async () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);

      await DataMapperValidationStepService.addValidationStep(
        vizNode,
        jsonMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        {},
      );

      const addedStep = model.steps[1] as { to: { id: string; uri: string } };
      expect(addedStep.to.id).toMatch(/^kaoto-datamapper-json-validator-/);
    });

    it('should do nothing for Primitive target', async () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');

      await DataMapperValidationStepService.addValidationStep(
        vizNode,
        primitiveMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        {},
      );

      expect(model.steps).toHaveLength(1);
      expect(updateModelSpy).not.toHaveBeenCalled();
      expect(mockEntitiesContext.updateSourceCodeFromEntities).not.toHaveBeenCalled();
    });

    it('should do nothing when filePath is empty', async () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');

      await DataMapperValidationStepService.addValidationStep(
        vizNode,
        emptyFilePathMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        {},
      );

      expect(model.steps).toHaveLength(1);
      expect(updateModelSpy).not.toHaveBeenCalled();
      expect(mockEntitiesContext.updateSourceCodeFromEntities).not.toHaveBeenCalled();
    });

    it('should generate wrapper and use its URI for multi-file targets', async () => {
      const model = createModel('xslt-saxon:transform.xsl');
      const vizNode = createVizNode(model);
      const multiMetadata = {
        type: DocumentDefinitionType.XML_SCHEMA,
        filePath: ['root.xsd', 'ext.xsd'],
      } as IDocumentMetadata;

      const fileContent =
        '<?xml version="1.0" encoding="UTF-8"?><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:animals"><xs:element name="Animal" type="xs:string"/></xs:schema>';
      mockApi.getResourceContent.mockResolvedValue(fileContent);

      await DataMapperValidationStepService.addValidationStep(
        vizNode,
        multiMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        { 'root.xsd': fileContent, 'ext.xsd': fileContent },
      );

      expect(model.steps).toHaveLength(2);
      expect((model.steps[1] as ProcessorDefinition).to).toMatchObject({
        uri: 'validator:transform-validation-wrapper.xsd',
      });
      expect(mockApi.saveResourceContent).toHaveBeenCalled();
    });
  });

  describe('removeValidationStep', () => {
    it('should remove validator step and preserve XSLT step', async () => {
      const model = createModel('xslt-saxon:transform.xsl', 'validator:ShipOrder.xsd');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');

      await DataMapperValidationStepService.removeValidationStep(
        vizNode,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
      );

      expect(model.steps).toHaveLength(1);
      expect((model.steps[0] as ProcessorDefinition).to).toMatchObject({ uri: 'xslt-saxon:transform.xsl' });
      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
    });

    it('should clean up wrapper if wrapper marker is present', async () => {
      const model = createModel('xslt-saxon:transform.xsl', 'validator:transform-validation-wrapper.xsd');
      const vizNode = createVizNode(model);
      mockApi.getResourceContent.mockResolvedValue(
        '<!-- Generated by Kaoto DataMapper for transform.xsl. Do not edit; it is regenerated. -->',
      );

      await DataMapperValidationStepService.removeValidationStep(
        vizNode,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
      );

      expect(mockApi.deleteResource).toHaveBeenCalledWith('transform-validation-wrapper.xsd');
    });

    it('should not delete user file if wrapper marker is missing', async () => {
      const model = createModel('xslt-saxon:transform.xsl', 'validator:transform-validation-wrapper.xsd');
      const vizNode = createVizNode(model);
      mockApi.getResourceContent.mockResolvedValue('<!-- Arbitrary user content -->');

      await DataMapperValidationStepService.removeValidationStep(
        vizNode,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
      );

      expect(mockApi.deleteResource).not.toHaveBeenCalled();
    });
  });

  describe('updateValidationStep', () => {
    it('should update URI when file changes for same type (XML)', async () => {
      const model = createModel('xslt-saxon:transform.xsl', 'validator:Old.xsd');
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');
      const newMetadata = { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['New.xsd'] } as IDocumentMetadata;

      await DataMapperValidationStepService.updateValidationStep(
        vizNode,
        newMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        {},
      );

      expect((model.steps[1] as ProcessorDefinition).to).toMatchObject({ uri: 'validator:New.xsd' });
      expect(updateModelSpy).toHaveBeenCalledWith(model);
      expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalledTimes(1);
    });

    it('should remove step and wrapper when target becomes Primitive', async () => {
      const model = createModel('xslt-saxon:transform.xsl', 'validator:transform-validation-wrapper.xsd');
      const vizNode = createVizNode(model);
      mockApi.getResourceContent.mockResolvedValue(
        '<!-- Generated by Kaoto DataMapper for transform.xsl. Do not edit; it is regenerated. -->',
      );

      await DataMapperValidationStepService.updateValidationStep(
        vizNode,
        primitiveMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        {},
      );

      expect(model.steps).toHaveLength(1);
      expect(mockApi.deleteResource).toHaveBeenCalledWith('transform-validation-wrapper.xsd');
    });

    it('should remove JSON validator when target becomes Primitive', async () => {
      const model = createModel('xslt-saxon:transform.xsl', 'json-validator:Target.json');
      const vizNode = createVizNode(model);
      await DataMapperValidationStepService.updateValidationStep(
        vizNode,
        primitiveMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        {},
      );
      expect(model.steps).toHaveLength(1);
    });

    it('should do nothing if no validator step exists', async () => {
      const model = {
        id: 'group-1',
        steps: [{ to: { uri: 'xslt-saxon:transform.xsl' } }],
      } as any;
      const vizNode = createVizNode(model);
      const updateModelSpy = vi.spyOn(vizNode, 'updateModel');

      await DataMapperValidationStepService.updateValidationStep(
        vizNode,
        { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['New.xsd'] } as IDocumentMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        {},
      );

      expect(model.steps).toHaveLength(1);
      expect(updateModelSpy).not.toHaveBeenCalled();
    });

    it('should update URI when file changes for same type (JSON)', async () => {
      const model = createModel('xslt-saxon:transform.xsl', 'json-validator:Old.json');
      const vizNode = createVizNode(model);
      const newMetadata = { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['New.json'] } as IDocumentMetadata;

      await DataMapperValidationStepService.updateValidationStep(
        vizNode,
        newMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        {},
      );

      expect((model.steps[1] as ProcessorDefinition).to).toMatchObject({ uri: 'json-validator:New.json' });
    });

    it('should swap validator component and retain/update ID when target type changes (XML to JSON)', async () => {
      const model = {
        id: 'group-1',
        steps: [{ to: { uri: 'xslt-saxon:transform.xsl' } }, { to: { id: 'val-id-123', uri: 'validator:Old.xsd' } }],
      } as any;
      const vizNode = createVizNode(model);
      const newMetadata = { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['New.json'] } as IDocumentMetadata;

      await DataMapperValidationStepService.updateValidationStep(
        vizNode,
        newMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        {},
      );

      const validatorStep = model.steps[1] as any;
      expect(validatorStep.to.uri).toBe('json-validator:New.json');
      expect(validatorStep.to.id).toContain('kaoto-datamapper-json-validator');
    });

    it('should swap validator component and retain/update ID when target type changes (JSON to XML)', async () => {
      const model = {
        id: 'group-1',
        steps: [
          { to: { uri: 'xslt-saxon:transform.xsl' } },
          { to: { id: 'val-id-456', uri: 'json-validator:Old.json' } },
        ],
      } as any;
      const vizNode = createVizNode(model);
      const newMetadata = { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['New.xsd'] } as IDocumentMetadata;

      await DataMapperValidationStepService.updateValidationStep(
        vizNode,
        newMetadata,
        mockEntitiesContext,
        mockApi,
        'transform.xsl',
        {},
      );

      const validatorStep = model.steps[1] as any;
      expect(validatorStep.to.uri).toBe('validator:New.xsd');
      expect(validatorStep.to.id).toContain('kaoto-datamapper-validator');
    });
  });

  describe('duplicateWrapper', () => {
    it('should rewrite URI and copy wrapper file if original exists', async () => {
      const stepDef = {
        id: 'cloned-id',
        steps: [
          { to: { uri: 'xslt-saxon:clone.xsl' } },
          { to: { id: 'v-id', uri: 'validator:transform-validation-wrapper.xsd' } },
        ],
      };
      mockApi.isResourceExist.mockResolvedValue(true);
      mockApi.getResourceContent.mockResolvedValue(
        '<!-- Generated by Kaoto DataMapper for transform.xsl. Do not edit; it is regenerated. -->',
      );

      await DataMapperValidationStepService.duplicateWrapper(mockApi, 'transform.xsl', 'clone.xsl', stepDef);

      const steps = stepDef.steps as any[];
      expect(steps[1].to.uri).toBe('validator:clone-validation-wrapper.xsd');
      expect(mockApi.saveResourceContent).toHaveBeenCalledWith(
        'clone-validation-wrapper.xsd',
        expect.stringContaining('Generated by Kaoto DataMapper'),
      );
    });
  });
});
