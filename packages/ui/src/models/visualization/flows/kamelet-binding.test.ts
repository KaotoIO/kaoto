import { KameletBinding as KameletBindingModel } from '@kaoto-next/camel-catalog/types';
import { JSONSchemaType } from 'ajv';
import { kameletBindingJson } from '../../../stubs/kamelet-binding';
import { EntityType } from '../../camel-entities';
import { KameletBinding } from './kamelet-binding';
import { KameletSchemaService } from './kamelet-schema.service';

describe('Kamelet Binding', () => {
  let kameletBinding: KameletBinding;

  beforeEach(() => {
    kameletBinding = new KameletBinding(JSON.parse(JSON.stringify(kameletBindingJson)));
  });

  describe('id', () => {
    it('should have an uuid', () => {
      expect(kameletBinding.id).toBeDefined();
      expect(typeof kameletBinding.id).toBe('string');
    });

    it('should have a type', () => {
      expect(kameletBinding.type).toEqual(EntityType.KameletBinding);
    });

    it('should return the id', () => {
      expect(kameletBinding.getId()).toEqual(expect.any(String));
    });
  });

  describe('getComponentSchema', () => {
    it('should return undefined if no path is provided', () => {
      expect(kameletBinding.getComponentSchema()).toBeUndefined();
    });

    it('should return undefined if no component model is found', () => {
      const result = kameletBinding.getComponentSchema('test');

      expect(result).toBeUndefined();
    });

    it('should return the component schema', () => {
      const spy = jest.spyOn(KameletSchemaService, 'getVisualComponentSchema');
      spy.mockReturnValueOnce({
        title: 'test',
        schema: {} as JSONSchemaType<unknown>,
        definition: {},
      });

      kameletBinding.getComponentSchema('source');
      expect(spy).toBeCalledTimes(1);
    });
  });

  it('should return the json', () => {
    expect(kameletBinding.toJSON()).toEqual(kameletBindingJson);
  });

  describe('updateModel', () => {
    it('should not update the model if no path is provided', () => {
      const originalObject = JSON.parse(JSON.stringify(kameletBindingJson));

      kameletBinding.updateModel(undefined, undefined);

      expect(originalObject).toEqual(kameletBindingJson);
    });

    it('should update the model', () => {
      const name = 'timer-source';

      kameletBinding.updateModel('source.ref.name', name);

      expect(kameletBinding.route.spec?.source?.ref?.name).toEqual(name);
    });
  });

  describe('getSteps', () => {
    it('should return an empty array if there is no route', () => {
      const route = new KameletBinding();

      expect(route.getSteps()).toEqual([]);
    });

    it('should return an empty array if there is no steps', () => {
      const route = new KameletBinding({ spec: {} } as KameletBindingModel);

      expect(route.getSteps()).toEqual([]);
    });

    it('should return the steps', () => {
      expect(kameletBinding.getSteps()).toEqual([
        {
          ref: {
            apiVersion: 'camel.apache.org/v1',
            kind: 'Kamelet',
            name: 'log-sink',
            properties: {
              showHeaders: 'true',
            },
          },
        },
        {
          ref: {
            apiVersion: 'camel.apache.org/v1',
            kind: 'Kamelet',
            name: 'kafka-sink',
            properties: {
              bootstrapServers: '192.168.0.1',
              password: 'test',
              topic: 'myTopic',
              user: 'test2',
            },
          },
        },
      ]);
    });
  });

  describe('toVizNode', () => {
    it('should return the viz node and set the initial path to `source`', () => {
      const vizNode = kameletBinding.toVizNode();

      expect(vizNode).toBeDefined();
      expect(vizNode.path).toEqual('source');
    });

    it('should use the uri as the node label', () => {
      const vizNode = kameletBinding.toVizNode();

      expect(vizNode.label).toEqual('timer-source');
    });

    it('should set an empty label if the uri is not available', () => {
      kameletBinding = new KameletBinding({ spec: {} } as KameletBindingModel);
      const vizNode = kameletBinding.toVizNode();

      expect(vizNode.label).toBeUndefined();
    });

    it('should populate the viz node chain with the steps', () => {
      const vizNode = kameletBinding.toVizNode();

      expect(vizNode.path).toEqual('source');
      expect(vizNode.label).toEqual('timer-source');
      expect(vizNode.getPreviousNode()).toBeUndefined();
      expect(vizNode.getNextNode()).toBeDefined();

      const steps0 = vizNode.getNextNode()!;
      expect(steps0.path).toEqual('steps.0');
      expect(steps0.label).toEqual('log-sink');
      expect(steps0.getPreviousNode()).toBe(vizNode);
      expect(steps0.getNextNode()).toBeDefined();

      const sink = steps0.getNextNode()!;
      expect(sink.path).toEqual('sink');
      expect(sink.label).toEqual('kafka-sink');
      expect(sink.getPreviousNode()).toBe(steps0);
      expect(sink.getNextNode()).toBeUndefined();
    });
  });
});
