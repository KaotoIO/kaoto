import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { getFirstCatalogMap } from '../../../../../stubs/test-load-catalog';
import { CatalogKind } from '../../../../catalog-kind';
import { CamelCatalogService } from '../../camel-catalog.service';
import { CamelComponentSchemaService } from '../camel-component-schema.service';
import { ModelValidationService } from './model-validation.service';

describe('ModelValidationService', () => {
  const camelRoute = {
    route: {
      id: 'route-8888',
      from: {
        uri: 'timer:tutorial',
        steps: [
          {
            to: {
              uri: 'activemq',
              parameters: {},
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
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, catalogsMap.kameletsCatalogMap);
  });

  describe('validateNodeStatus()', () => {
    it('should return a validation text pointing to a single missing property', () => {
      const model = camelRoute.route.from.steps[0].to;
      const path = 'route.from.steps[0].to';
      const schema = CamelComponentSchemaService.getVisualComponentSchema(path, model);

      const result = ModelValidationService.validateNodeStatus(schema);

      expect(result).toEqual('1 required parameter is not yet configured: [ destinationName ]');
    });

    it('should return a validation text pointing to multiple missing properties', () => {
      const model = camelRoute.route.from.steps[1].to;
      const path = 'route.from.steps[1].to';
      const schema = CamelComponentSchemaService.getVisualComponentSchema(path, model);

      const result = ModelValidationService.validateNodeStatus(schema);

      expect(result).toEqual('2 required parameters are not yet configured: [ topic,bootstrapServers ]');
    });

    it('should return an empty string if there is no missing property', () => {
      const model = { ...camelRoute.route.from.steps[0].to, parameters: { destinationName: 'myQueue' } };
      const path = 'route.from.steps[0].to';
      const schema = CamelComponentSchemaService.getVisualComponentSchema(path, model);

      const result = ModelValidationService.validateNodeStatus(schema);

      expect(result).toEqual('');
    });

    it('should return an empty string if the schema is undefined', () => {
      const result = ModelValidationService.validateNodeStatus(undefined);

      expect(result).toEqual('');
    });
  });
});
