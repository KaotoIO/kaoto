import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { getFirstCatalogMap } from '../../../../../stubs/test-load-catalog';
import { CatalogKind } from '../../../../catalog-kind';
import { CamelCatalogService } from '../../camel-catalog.service';
import { CamelComponentSchemaService } from '../camel-component-schema.service';
import { ModelValidationService } from './model-validation.service';
import { VisualComponentSchema } from '../../../base-visual-entity';

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
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, catalogsMap.kameletsCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Language, catalogsMap.languageCatalog);
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
      const model = camelRoute.route.from.steps[2].to;
      const path = 'route.from.steps[2].to';
      const schema = CamelComponentSchemaService.getVisualComponentSchema(path, model);

      const result = ModelValidationService.validateNodeStatus(schema);

      expect(result).toEqual('2 required parameters are not yet configured: [ topic,bootstrapServers ]');
    });

    it('should return a validation text for setheader pointing to multiple missing properties', () => {
      const model = camelRoute.route.from.steps[1].setHeader;
      const path = 'route.from.steps[1].setHeader';
      const schema = CamelComponentSchemaService.getVisualComponentSchema(path, model);

      const result = ModelValidationService.validateNodeStatus(schema);

      expect(result).toEqual('2 required parameters are not yet configured: [ expression,name ]');
    });

    it('should return a validation text for setheader with a different model dialect', () => {
      const model = {
        name: 'test',
        constant: 'Hello Camel',
      };
      const path = 'route.from.steps[1].setHeader';
      const schema = CamelComponentSchemaService.getVisualComponentSchema(path, model);

      const result = ModelValidationService.validateNodeStatus(schema);

      expect(result).toEqual('');
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

  describe('validateNodeStatus() - array required property', () => {
    const arraySchema = {
      schema: {
        properties: {
          items: {
            type: 'array',
          },
        },
        required: ['items'],
        definitions: {},
      },
      definition: {},
    } as VisualComponentSchema;

    it('should report missing required array property when not present', () => {
      const result = ModelValidationService.validateNodeStatus(arraySchema);
      expect(result).toEqual('1 required parameter is not yet configured: [ items ]');
    });

    it('should report missing required array property when empty', () => {
      const model = { items: [] };
      const result = ModelValidationService.validateNodeStatus({ ...arraySchema, definition: model });
      expect(result).toEqual('1 required parameter is not yet configured: [ items ]');
    });

    it('should not report missing required array property when array is non-empty', () => {
      const model = { items: [1, 2, 3] };
      const result = ModelValidationService.validateNodeStatus({ ...arraySchema, definition: model });
      expect(result).toEqual('');
    });
  });
});
