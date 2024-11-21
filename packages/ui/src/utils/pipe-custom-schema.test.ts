import { cloneDeep } from 'lodash';
import { Pipe } from '@kaoto/camel-catalog/types';
import { updatePipeFromCustomSchema, getCustomSchemaFromPipe } from './';

describe('pipeCustomSchema', () => {
  let inputPipeStruct: Pipe;

  beforeEach(() => {
    inputPipeStruct = {
      apiVersion: 'camel.apache.org/v1',
      kind: 'Pipe',
      metadata: {
        name: 'webhook-binding',
        annotations: {
          'sco1237896.github.com/catalog.group': 'messaging',
          'sco1237896.github.com/catalog.id': 'http',
          'sco1237896.github.com/connector.description': 'Send data to a HTTP endpoint.',
          'sco1237896.github.com/connector.group': 'messaging',
          'sco1237896.github.com/connector.id': 'http_sink_v1',
          'sco1237896.github.com/connector.title': 'HTTP sink',
          'sco1237896.github.com/connector.version': 'v1',
          'trait.camel.apache.org/container.request-cpu': '0.20',
          'trait.camel.apache.org/container.request-memory': '128M',
          'trait.camel.apache.org/deployment.progress-deadline-seconds': '30',
          'trait.camel.apache.org/container.image': 'quay.io/sco1237896/connector-http:camel-4-1046a96',
        },
      },
      spec: {
        errorHandler: {
          log: {
            parameters: {
              maximumRedeliveries: 3,
              redeliveryDelay: 2000,
            },
          },
        },
        source: {
          ref: {
            kind: 'Kamelet',
            apiVersion: 'camel.apache.org/v1',
            name: 'webhook-source',
          },
        },
        steps: [
          {
            ref: {
              kind: 'Kamelet',
              apiVersion: 'camel.apache.org/v1',
              name: 'delay-action',
            },
          },
        ],
        sink: {
          ref: {
            kind: 'Kamelet',
            apiVersion: 'camel.apache.org/v1',
            name: 'log-sink',
          },
        },
      },
    };
  });

  describe('updatePipeFromCustomSchema', () => {
    it(`should preserve Pipe's original values when loading a malformed custom schema`, () => {
      const originalValue = cloneDeep(inputPipeStruct);
      const value = undefined;

      updatePipeFromCustomSchema(inputPipeStruct, value as unknown as Record<string, unknown>);
      expect(inputPipeStruct).toEqual(originalValue);
    });

    it('should mutate the original kamelet when loading a custom schema', () => {
      const value = {
        name: 'test',
        labels: {
          type: 'Action',
        },
        annotations: {
          foo: 'bar',
        },
      };

      updatePipeFromCustomSchema(inputPipeStruct, value as unknown as Record<string, unknown>);

      expect(inputPipeStruct.metadata!.name).toEqual(value.name);
      expect(inputPipeStruct.metadata!.labels).toEqual(value.labels);
      expect(inputPipeStruct.metadata!.annotations).toEqual(value.annotations);
    });
  });

  describe('getCustomSchemaFromPipe', () => {
    it('should get a custom pipe definition from a empty pipe', () => {
      const expectedCustomSchema = {
        name: '',
        labels: {},
        annotations: {},
      };

      const customSchema = getCustomSchemaFromPipe({} as Pipe);
      expect(customSchema).toEqual(expectedCustomSchema);
    });

    it('should get a custom pipe definition from a pipe official spec', () => {
      const expectedCustomSchema = {
        name: 'webhook-binding',
        labels: {},
        annotations: {
          'sco1237896.github.com/catalog.group': 'messaging',
          'sco1237896.github.com/catalog.id': 'http',
          'sco1237896.github.com/connector.description': 'Send data to a HTTP endpoint.',
          'sco1237896.github.com/connector.group': 'messaging',
          'sco1237896.github.com/connector.id': 'http_sink_v1',
          'sco1237896.github.com/connector.title': 'HTTP sink',
          'sco1237896.github.com/connector.version': 'v1',
          'trait.camel.apache.org/container.request-cpu': '0.20',
          'trait.camel.apache.org/container.request-memory': '128M',
          'trait.camel.apache.org/deployment.progress-deadline-seconds': '30',
          'trait.camel.apache.org/container.image': 'quay.io/sco1237896/connector-http:camel-4-1046a96',
        },
      };

      const customSchema = getCustomSchemaFromPipe(inputPipeStruct);
      expect(customSchema).toEqual(expectedCustomSchema);
    });
  });
});
