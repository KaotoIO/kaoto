import * as catalogIndex from '@kaoto-next/camel-catalog/index.json';
import { Pipe } from '@kaoto-next/camel-catalog/types';
import cloneDeep from 'lodash/cloneDeep';
import { pipeJson } from '../../../stubs/pipe';
import { EntityType } from '../../camel/entities';
import { CatalogKind } from '../../catalog-kind';
import { IKameletDefinition } from '../../kamelets-catalog';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { CamelCatalogService } from './camel-catalog.service';
import { PipeVisualEntity } from './pipe-visual-entity';
import { KameletSchemaService } from './support/kamelet-schema.service';

describe('Pipe', () => {
  let pipeCR: Pipe;
  let pipe: PipeVisualEntity;
  let kameletCatalogMap: Record<string, unknown>;

  beforeEach(async () => {
    pipeCR = cloneDeep(pipeJson);
    pipe = new PipeVisualEntity(pipeCR.spec!);
    kameletCatalogMap = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.kamelets.file);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, kameletCatalogMap as Record<string, IKameletDefinition>);
  });

  describe('id', () => {
    it('should have an uuid', () => {
      expect(pipe.id).toBeDefined();
      expect(typeof pipe.id).toBe('string');
    });

    it('should have a type', () => {
      expect(pipe.type).toEqual(EntityType.Pipe);
    });

    it('should return the id', () => {
      expect(pipe.getId()).toEqual(expect.any(String));
    });

    it('should change the id', () => {
      pipe.setId('pipe-12345');
      expect(pipe.getId()).toEqual('pipe-12345');
    });
  });

  describe('getComponentSchema', () => {
    it('should return undefined if no path is provided', () => {
      expect(pipe.getComponentSchema()).toBeUndefined();
    });

    it('should return undefined if no component model is found', () => {
      const result = pipe.getComponentSchema('test');

      expect(result).toBeUndefined();
    });

    it('should return the component schema', () => {
      const spy = jest.spyOn(KameletSchemaService, 'getVisualComponentSchema');
      spy.mockReturnValueOnce({
        title: 'test',
        schema: {} as KaotoSchemaDefinition['schema'],
        definition: {},
      });

      pipe.getComponentSchema('source');
      expect(spy).toBeCalledTimes(1);
    });
  });

  it('should return the json', () => {
    expect(pipe.toJSON()).toEqual(pipeJson.spec);
  });

  describe('updateModel', () => {
    it('should not update the model if no path is provided', () => {
      const originalObject = JSON.parse(JSON.stringify(pipeJson));

      pipe.updateModel(undefined, undefined);

      expect(originalObject).toEqual(pipeJson);
    });

    it('should update the model', () => {
      const name = 'webhook-source';

      pipe.updateModel('source', { name });

      expect(pipe.spec?.source?.properties?.name).toEqual(name);
    });

    it('should not update the model if the path is not correct', () => {
      const name = 'webhook-source';

      pipe.updateModel('nonExistingPath', { name });

      expect(pipe.spec?.source?.properties).toBeUndefined();
    });
  });

  describe('removeStep', () => {
    it('should not remove the step if no path is provided', () => {
      pipe.removeStep();

      expect(pipe.toJSON()).toEqual(pipeJson.spec);
    });

    it('should remove the `source` step', () => {
      pipe.removeStep('source');

      expect(pipe.toJSON()).not.toEqual(pipeJson.spec);
      expect(pipe.spec?.source).toEqual({});
    });

    it('should remove the `sink` step', () => {
      pipe.removeStep('sink');

      expect(pipe.toJSON()).not.toEqual(pipeJson.spec);
      expect(pipe.spec?.sink).toEqual({});
    });

    it('should remove the `steps.0` step', () => {
      pipe.removeStep('steps.0');

      expect(pipe.toJSON()).not.toEqual(pipeJson.spec);
      expect(pipe.spec.steps).toEqual([]);
    });
  });

  describe('getNodeInteraction', () => {
    it.each(['source', 'sink', 'steps.1', '#'])(
      `should return the correct interaction for the '%s' processor`,
      (path) => {
        const result = pipe.getNodeInteraction({ path });
        expect(result).toMatchSnapshot();
      },
    );
  });

  describe('getNodeValidationText', () => {
    it('should return an `undefined` if the path is `undefined`', () => {
      const result = pipe.getNodeValidationText(undefined);

      expect(result).toEqual(undefined);
    });

    it('should return an `undefined` if the path is empty', () => {
      const result = pipe.getNodeValidationText('');

      expect(result).toEqual(undefined);
    });

    it('should return a validation text relying on the `validateNodeStatus` method', () => {
      const missingParametersModel = cloneDeep(pipeJson.spec);
      missingParametersModel!.steps![0].properties = {};
      pipe = new PipeVisualEntity(missingParametersModel);

      const result = pipe.getNodeValidationText('steps.0');

      expect(result).toEqual('1 required parameter is not yet configured: [ milliseconds ]');
    });
  });

  describe('toVizNode', () => {
    it('should return the viz node and set the initial path to `source`', () => {
      const vizNode = pipe.toVizNode();

      expect(vizNode).toBeDefined();
      expect(vizNode.data.path).toEqual('source');
    });

    it('should use the uri as the node label', () => {
      const vizNode = pipe.toVizNode();

      expect(vizNode.getNodeLabel()).toEqual('webhook-source');
    });

    it('should set the node labels as `Unknown` if the uri is not available', () => {
      pipe = new PipeVisualEntity({});
      const sourceNode = pipe.toVizNode();
      const sinkNode = sourceNode.getNextNode();

      expect(sourceNode.getNodeLabel()).toEqual('source: Unknown');
      expect(sinkNode!.getNodeLabel()).toEqual('sink: Unknown');
    });

    it('should populate the viz node chain with the steps', () => {
      const vizNode = pipe.toVizNode();

      expect(vizNode.data.path).toEqual('source');
      expect(vizNode.getNodeLabel()).toEqual('webhook-source');
      expect(vizNode.getPreviousNode()).toBeUndefined();
      expect(vizNode.getNextNode()).toBeDefined();

      const steps0 = vizNode.getNextNode()!;
      expect(steps0.data.path).toEqual('steps.0');
      expect(steps0.getNodeLabel()).toEqual('delay-action');
      expect(steps0.getPreviousNode()).toBe(vizNode);
      expect(steps0.getNextNode()).toBeDefined();

      const sink = steps0.getNextNode()!;
      expect(sink.data.path).toEqual('sink');
      expect(sink.getNodeLabel()).toEqual('log-sink');
      expect(sink.getPreviousNode()).toBe(steps0);
      expect(sink.getNextNode()).toBeUndefined();
    });
  });
});
