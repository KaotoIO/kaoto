import { JSONSchemaType } from 'ajv';
import { pipeJson } from '../../../stubs/pipe';
import { EntityType } from '../../camel/entities';
import { KameletSchemaService } from './kamelet-schema.service';
import { PipeVisualEntity } from './pipe-visual-entity';

describe('Pipe', () => {
  let pipe: PipeVisualEntity;

  beforeEach(() => {
    const pipeCR = JSON.parse(JSON.stringify(pipeJson));
    pipe = new PipeVisualEntity(pipeCR.spec);
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

  describe('toVizNode', () => {
    it('should return the viz node and set the initial path to `source`', () => {
      const vizNode = pipe.toVizNode();

      expect(vizNode).toBeDefined();
      expect(vizNode.data.path).toEqual('source');
    });

    it('should use the uri as the node label', () => {
      const vizNode = pipe.toVizNode();

      expect(vizNode.data.label).toEqual('webhook-source');
    });

    it('should set an empty label if the uri is not available', () => {
      pipe = new PipeVisualEntity({});
      const vizNode = pipe.toVizNode();

      expect(vizNode.data.label).toEqual('Unknown');
    });

    it('should populate the viz node chain with the steps', () => {
      const vizNode = pipe.toVizNode();

      expect(vizNode.data.path).toEqual('source');
      expect(vizNode.data.label).toEqual('webhook-source');
      expect(vizNode.getPreviousNode()).toBeUndefined();
      expect(vizNode.getNextNode()).toBeDefined();

      const steps0 = vizNode.getNextNode()!;
      expect(steps0.data.path).toEqual('steps.0');
      expect(steps0.data.label).toEqual('delay-action');
      expect(steps0.getPreviousNode()).toBe(vizNode);
      expect(steps0.getNextNode()).toBeDefined();

      const sink = steps0.getNextNode()!;
      expect(sink.data.path).toEqual('sink');
      expect(sink.data.label).toEqual('log-sink');
      expect(sink.getPreviousNode()).toBe(steps0);
      expect(sink.getNextNode()).toBeUndefined();
    });
  });
});
