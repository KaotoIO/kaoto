import { Pipe } from '@kaoto-next/camel-catalog/types';
import { JSONSchemaType } from 'ajv';
import cloneDeep from 'lodash/cloneDeep';
import { pipeJson } from '../../../stubs/pipe';
import { EntityType } from '../../camel/entities';
import { PipeVisualEntity } from './';
import { KameletSchemaService } from './support/kamelet-schema.service';

describe('Pipe', () => {
  let pipeCR: Pipe;
  let pipe: PipeVisualEntity;

  beforeEach(() => {
    pipeCR = cloneDeep(pipeJson);
    pipe = new PipeVisualEntity(pipeCR.spec!);
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
        schema: {} as JSONSchemaType<unknown>,
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

      pipe.updateModel('source.ref.name', name);

      expect(pipe.spec?.source?.ref?.name).toEqual(name);
    });
  });

  describe('getSteps', () => {
    it('should return an empty array if there is no steps', () => {
      const route = new PipeVisualEntity({});

      expect(route.getSteps()).toEqual([]);
    });

    it('should return the steps', () => {
      expect(pipe.getSteps()).toEqual([
        {
          ref: {
            apiVersion: 'camel.apache.org/v1',
            kind: 'Kamelet',
            name: 'delay-action',
          },
        },
        {
          ref: {
            apiVersion: 'camel.apache.org/v1',
            kind: 'Kamelet',
            name: 'log-sink',
          },
        },
      ]);
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
