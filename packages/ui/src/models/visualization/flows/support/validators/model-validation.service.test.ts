import catalogLibrary from '@kaoto/camel-catalog/index.json';

import { getFirstCatalogMap } from '../../../../../stubs/test-load-catalog';
import { CatalogKind } from '../../../../catalog-kind';
import { KaotoSchemaDefinition } from '../../../../kaoto-schema';
import { CamelCatalogService } from '../../camel-catalog.service';
import { setupDynamicCatalogRegistryMock } from '../../dynamic-catalog-registry-mock';
import { CamelComponentSchemaService } from '../camel-component-schema.service';
import { ModelValidationService } from './model-validation.service';

jest.mock('../../../../../dynamic-catalog/dynamic-catalog-registry');

describe('ModelValidationService', () => {
  const camelRoute = {
    route: {
      id: 'route-8888',
      from: {
        uri: 'timer',
        parameters: {
          timerName: 'tutorial',
        },
        steps: [
          {
            to: {
              uri: 'activemq',
              parameters: {},
            },
          },
          {
            setHeader: {
              id: 'test',
              constant: {},
            },
          },
          {
            to: {
              description: 'azz',
              uri: 'kamelet:kafka-not-secured-sink',
              parameters: {},
            },
          },
        ],
      },
    },
  };

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary);
    setupDynamicCatalogRegistryMock(catalogsMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Language, catalogsMap.languageCatalog);
  });

  describe('validateNodeStatus()', () => {
    it('should return a validation text pointing to a single missing property', async () => {
      const schema = await CamelComponentSchemaService.getSchema({ processorName: 'to', componentName: 'activemq' });
      const model = camelRoute.route.from.steps[0].to;

      const result = ModelValidationService.validateNodeStatus(schema, model);

      expect(result).toEqual('1 required parameter is not yet configured: [ destinationName ]');
    });

    it('should return a validation text pointing to multiple missing properties', async () => {
      const schema = await CamelComponentSchemaService.getSchema({
        processorName: 'to',
        componentName: 'kamelet:kafka-not-secured-sink',
      });
      const model = camelRoute.route.from.steps[2].to;

      const result = ModelValidationService.validateNodeStatus(schema, model);

      expect(result).toEqual('1 required parameter is not yet configured: [ templateId ]');
    });

    it('should return a validation text for setheader pointing to multiple missing properties', async () => {
      const schema = await CamelComponentSchemaService.getSchema({ processorName: 'setHeader' });
      const model = camelRoute.route.from.steps[1].setHeader;

      const result = ModelValidationService.validateNodeStatus(schema, model);

      expect(result).toEqual('2 required parameters are not yet configured: [ expression,name ]');
    });

    it('should return a validation text for setheader with a different model dialect', async () => {
      const schema = await CamelComponentSchemaService.getSchema({ processorName: 'setHeader' });
      const model = {
        name: 'test',
        constant: 'Hello Camel',
      };

      const result = ModelValidationService.validateNodeStatus(schema, model);

      expect(result).toEqual('');
    });

    it('should return an empty string if there is no missing property', async () => {
      const schema = await CamelComponentSchemaService.getSchema({ processorName: 'to', componentName: 'activemq' });
      const model = { ...camelRoute.route.from.steps[0].to, parameters: { destinationName: 'myQueue' } };

      const result = ModelValidationService.validateNodeStatus(schema, model);

      expect(result).toEqual('');
    });

    it('should return an empty string if the schema is undefined', () => {
      const result = ModelValidationService.validateNodeStatus(
        undefined as unknown as KaotoSchemaDefinition['schema'],
        {},
      );

      expect(result).toEqual('');
    });
  });

  describe('validateNodeStatus() - array required property', () => {
    const arraySchema: KaotoSchemaDefinition['schema'] = {
      properties: {
        items: {
          type: 'array',
        },
      },
      required: ['items'],
      definitions: {},
    };

    it('should report missing required array property when not present', () => {
      const model = {};
      const result = ModelValidationService.validateNodeStatus(arraySchema, model);
      expect(result).toEqual('1 required parameter is not yet configured: [ items ]');
    });

    it('should report missing required array property when empty', () => {
      const model = { items: [] };
      const result = ModelValidationService.validateNodeStatus(arraySchema, model);
      expect(result).toEqual('1 required parameter is not yet configured: [ items ]');
    });

    it('should not report missing required array property when array is non-empty', () => {
      const model = { items: [1, 2, 3] };
      const result = ModelValidationService.validateNodeStatus(arraySchema, model);
      expect(result).toEqual('');
    });
  });
});
