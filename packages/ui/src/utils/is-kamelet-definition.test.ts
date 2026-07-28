import { SourceSchemaType } from '../models/camel';
import { IKameletDefinition } from '../models/camel/kamelets-catalog';
import { camelFromJson } from '../stubs/camel-from';
import { camelRouteJson } from '../stubs/camel-route';
import { isKameletDefinition } from './is-kamelet-definition';

describe('isKameletDefinition', () => {
  const kameletDefinition: IKameletDefinition = {
    apiVersion: 'camel.apache.org/v1',
    kind: SourceSchemaType.Kamelet,
    metadata: {
      name: 'timer-source',
      annotations: {
        'camel.apache.org/kamelet.support.level': 'Preview',
        'camel.apache.org/catalog.version': '4.0.0',
        'camel.apache.org/kamelet.icon': 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        'camel.apache.org/provider': 'Kaoto',
        'camel.apache.org/kamelet.group': 'Timer',
        'camel.apache.org/kamelet.namespace': 'default',
      },
      labels: {
        'camel.apache.org/kamelet.type': 'source',
      },
    },
    spec: {
      definition: {
        title: 'Timer Source',
        type: 'object',
        properties: {},
      },
      dependencies: [],
      template: {
        from: {
          uri: 'timer:start',
          steps: [],
        },
      },
    },
  };

  it.each([
    [kameletDefinition, true],
    [{ spec: { template: { from: { uri: 'timer:start' } } } }, true],
    [{ route: { from: { uri: 'timer:start' } } }, false],
    [{ from: { uri: 'timer:start' } }, false],
    [camelRouteJson, false],
    [camelFromJson, false],
    [undefined, false],
    [null, false],
    [true, false],
    [false, false],
  ])('should mark %s as isKameletDefinition: %s', (entityDefinition, result) => {
    expect(isKameletDefinition(entityDefinition)).toEqual(result);
  });
});
