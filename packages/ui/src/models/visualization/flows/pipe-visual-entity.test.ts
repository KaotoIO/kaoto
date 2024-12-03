import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, Pipe } from '@kaoto/camel-catalog/types';
import { cloneDeep } from 'lodash';
import { pipeJson } from '../../../stubs/pipe';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { EntityType } from '../../camel/entities';
import { CatalogKind } from '../../catalog-kind';
import { IKameletDefinition } from '../../kamelets-catalog';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { CamelCatalogService } from './camel-catalog.service';
import { PipeVisualEntity } from './pipe-visual-entity';
import { KameletSchemaService } from './support/kamelet-schema.service';

describe('Pipe', () => {
  let pipeCR: Pipe;
  let pipeVisualEntity: PipeVisualEntity;
  let kameletCatalogMap: Record<string, IKameletDefinition>;

  beforeEach(async () => {
    pipeCR = cloneDeep(pipeJson);
    pipeVisualEntity = new PipeVisualEntity(pipeCR);
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    kameletCatalogMap = catalogsMap.kameletsCatalogMap;
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, kameletCatalogMap);
  });

  describe('id', () => {
    it('should have an uuid', () => {
      expect(pipeVisualEntity.id).toBeDefined();
      expect(typeof pipeVisualEntity.id).toBe('string');
    });

    it('should have a type', () => {
      expect(pipeVisualEntity.type).toEqual(EntityType.Pipe);
    });

    it('should return the id', () => {
      expect(pipeVisualEntity.getId()).toEqual(expect.any(String));
    });

    it('should change the id', () => {
      pipeVisualEntity.setId('pipe-12345');
      expect(pipeVisualEntity.getId()).toEqual('pipe-12345');
    });
  });

  describe('getComponentSchema', () => {
    it('should return undefined if no path is provided', () => {
      expect(pipeVisualEntity.getComponentSchema()).toBeUndefined();
    });

    it('should return undefined if no component model is found', () => {
      const result = pipeVisualEntity.getComponentSchema('test');

      expect(result).toBeUndefined();
    });

    it('should return the component schema', () => {
      const spy = jest.spyOn(KameletSchemaService, 'getVisualComponentSchema');
      spy.mockReturnValueOnce({
        schema: {} as KaotoSchemaDefinition['schema'],
        definition: {},
      });

      pipeVisualEntity.getComponentSchema('source');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  it('should return the json', () => {
    expect(pipeVisualEntity.toJSON()).toEqual(pipeJson.spec);
  });

  describe('updateModel', () => {
    it('should not update the model if no path is provided', () => {
      const originalObject = JSON.parse(JSON.stringify(pipeJson));

      pipeVisualEntity.updateModel(undefined, undefined as unknown as Record<string, unknown>);

      expect(originalObject).toEqual(pipeJson);
    });

    it('should update the model', () => {
      const name = 'webhook-source';

      pipeVisualEntity.updateModel('source', { name });

      expect(pipeVisualEntity.pipe.spec?.source?.properties?.name).toEqual(name);
    });

    it('should not update the model if the path is not correct', () => {
      const name = 'webhook-source';

      pipeVisualEntity.updateModel('nonExistingPath', { name });

      expect(pipeVisualEntity.pipe.spec?.source?.properties).toBeUndefined();
    });
  });

  describe('removeStep', () => {
    it('should not remove the step if no path is provided', () => {
      pipeVisualEntity.removeStep();

      expect(pipeVisualEntity.toJSON()).toEqual(pipeJson.spec);
    });

    it('should remove the `source` step', () => {
      pipeVisualEntity.removeStep('source');

      expect(pipeVisualEntity.toJSON()).not.toEqual(pipeJson.spec);
      expect(pipeVisualEntity.pipe.spec?.source).toEqual({});
    });

    it('should remove the `sink` step', () => {
      pipeVisualEntity.removeStep('sink');

      expect(pipeVisualEntity.toJSON()).not.toEqual(pipeJson.spec);
      expect(pipeVisualEntity.pipe.spec?.sink).toEqual({});
    });

    it('should remove the `steps.0` step', () => {
      pipeVisualEntity.removeStep('steps.0');

      expect(pipeVisualEntity.toJSON()).not.toEqual(pipeJson.spec);
      expect(pipeVisualEntity.pipe.spec!.steps).toEqual([]);
    });
  });

  describe('getNodeInteraction', () => {
    it.each(['source', 'sink', 'steps.1', '#'])(
      `should return the correct interaction for the '%s' processor`,
      (path) => {
        const result = pipeVisualEntity.getNodeInteraction({ path });
        expect(result).toMatchSnapshot();
      },
    );
  });

  describe('getNodeValidationText', () => {
    it('should return an `undefined` if the path is `undefined`', () => {
      const result = pipeVisualEntity.getNodeValidationText(undefined);

      expect(result).toEqual(undefined);
    });

    it('should return an `undefined` if the path is empty', () => {
      const result = pipeVisualEntity.getNodeValidationText('');

      expect(result).toEqual(undefined);
    });

    it('should return a validation text relying on the `validateNodeStatus` method', () => {
      const missingParametersModel = cloneDeep(pipeJson);
      missingParametersModel.spec!.steps![0].properties = {};
      pipeVisualEntity = new PipeVisualEntity(missingParametersModel);

      const result = pipeVisualEntity.getNodeValidationText('steps.0');

      expect(result).toEqual('1 required parameter is not yet configured: [ milliseconds ]');
    });
  });

  describe('toVizNode', () => {
    it('should return the viz node and set the initial path to `#`', () => {
      const vizNode = pipeVisualEntity.toVizNode();

      expect(vizNode).toBeDefined();
      expect(vizNode.data.path).toEqual('#');
    });

    it('should use the uri as the node label', () => {
      const vizNode = pipeVisualEntity.toVizNode();

      expect(vizNode.getNodeLabel()).toEqual('webhook-binding');
    });

    it('should set the title to `Pipe`', () => {
      const vizNode = pipeVisualEntity.toVizNode();

      expect(vizNode.getTitle()).toEqual('Pipe');
    });

    it('should set the title to children nodes', () => {
      const vizNode = pipeVisualEntity.toVizNode();

      const sourceNode = vizNode.getChildren()![0];
      const stepNode = vizNode.getChildren()![1];
      const sinkNode = vizNode.getChildren()![2];

      expect(sourceNode.getTitle()).toEqual('webhook-source');
      expect(stepNode.getTitle()).toEqual('delay-action');
      expect(sinkNode.getTitle()).toEqual('log-sink');
    });

    it('should set the node labels when the uri is not available', () => {
      pipeVisualEntity = new PipeVisualEntity({});

      const sourceNode = pipeVisualEntity.toVizNode().getChildren()![0];
      const sinkNode = sourceNode.getNextNode();

      expect(sourceNode.getNodeLabel()).toEqual('source');
      expect(sinkNode!.getNodeLabel()).toEqual('sink');
    });

    it('should populate the viz node chain with the steps', () => {
      const vizNode = pipeVisualEntity.toVizNode();

      expect(vizNode.data.path).toEqual('#');
      expect(vizNode.getNodeLabel()).toEqual('webhook-binding');
      expect(vizNode.getPreviousNode()).toBeUndefined();
      expect(vizNode.getNextNode()).toBeUndefined();
      expect(vizNode.getChildren()).toBeDefined();

      const source = vizNode.getChildren()![0];
      expect(source.getNodeLabel()).toEqual('webhook-source');
      expect(source.getPreviousNode()).toBeUndefined();
      expect(source.getNextNode()).toBeDefined();

      const steps0 = source.getNextNode()!;
      expect(steps0.data.path).toEqual('steps.0');
      expect(steps0.getNodeLabel()).toEqual('delay-action');
      expect(steps0.getPreviousNode()).toBe(source);
      expect(steps0.getNextNode()).toBeDefined();

      const sink = steps0.getNextNode()!;
      expect(sink.data.path).toEqual('sink');
      expect(sink.getNodeLabel()).toEqual('log-sink');
      expect(sink.getPreviousNode()).toBe(steps0);
      expect(sink.getNextNode()).toBeUndefined();
    });

    it('should include all steps as children of the Pipe group', () => {
      const vizNode = pipeVisualEntity.toVizNode();

      const sourceNode = vizNode.getChildren()![0];
      const stepNode = vizNode.getChildren()![1];
      const sinkNode = vizNode.getChildren()![2];

      expect(vizNode.getChildren()).toHaveLength(3);

      expect(sourceNode.getPreviousNode()).toBeUndefined();
      expect(sourceNode.getNextNode()).toBe(stepNode);

      expect(stepNode.getPreviousNode()).toBe(sourceNode);
      expect(stepNode.getNextNode()).toBe(sinkNode);

      expect(sinkNode.getPreviousNode()).toBe(stepNode);
      expect(sinkNode.getNextNode()).toBeUndefined();
    });
  });
});
