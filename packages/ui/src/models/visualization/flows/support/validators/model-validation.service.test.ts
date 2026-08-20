import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { DynamicCatalog } from '../../../../../dynamic-catalog/dynamic-catalog';
import { DynamicCatalogRegistry } from '../../../../../dynamic-catalog/dynamic-catalog-registry';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../../../stubs/test-load-catalog';
import { CatalogKind } from '../../../../catalog-kind';
import { KaotoSchemaDefinition } from '../../../../kaoto-schema';
import { CamelCatalogService } from '../../camel-catalog.service';
import { CamelRouteVisualEntity } from '../../camel-route-visual-entity';
import { ModelValidationService } from './model-validation.service';

describe('ModelValidationService', () => {
  let camelEntity: CamelRouteVisualEntity;

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
    setupDynamicCatalogRegistry(catalogsMap);
    /** ExpressionService.parseExpressionModel (called during setHeader validation) still reads from CamelCatalogService */
    CamelCatalogService.setCatalogKey(CatalogKind.Language, catalogsMap.languageCatalog);

    // Set up DynamicCatalogRegistry so that ExpressionService.parseExpressionModel can resolve language names
    const languageCatalog = catalogsMap.languageCatalog;
    const mockProvider = {
      id: 'language-mock',
      fetch: async (key: string) => languageCatalog[key],
      fetchAll: async () => languageCatalog,
    };
    DynamicCatalogRegistry.get().setCatalog(CatalogKind.Language, new DynamicCatalog(mockProvider));
  });

  afterAll(() => {
    DynamicCatalogRegistry.get().clearRegistry();
    CamelCatalogService.clearCatalogs();
  });

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    camelEntity = new CamelRouteVisualEntity(camelRoute as any);
  });

  describe('validateNodeStatus()', () => {
    it('should return a validation text pointing to a single missing property', async () => {
      const schema = await camelEntity.fetchNodeSchema({
        primaryNodeId: { name: 'to', catalogKind: CatalogKind.Pattern },
        secondaryNodeId: { name: 'activemq', catalogKind: CatalogKind.Component },
      });
      const model = camelRoute.route.from.steps[0].to;

      const result = await ModelValidationService.validateNodeStatus(schema!, model);

      expect(result).toBe('1 required parameter is not yet configured: [ destinationName ]');
    });

    it('should return a validation text pointing to multiple missing properties', async () => {
      const schema = await camelEntity.fetchNodeSchema({
        primaryNodeId: { name: 'to', catalogKind: CatalogKind.Pattern },
        secondaryNodeId: { name: 'kamelet', catalogKind: CatalogKind.Component },
        tertiaryNodeId: { name: 'kafka-not-secured-sink', catalogKind: CatalogKind.Kamelet },
      });
      const model = camelRoute.route.from.steps[2].to;

      const result = await ModelValidationService.validateNodeStatus(schema!, model);

      expect(result).toBe('1 required parameter is not yet configured: [ templateId ]');
    });

    it('should return a validation text for setheader pointing to multiple missing properties', async () => {
      const schema = await camelEntity.fetchNodeSchema({
        primaryNodeId: { name: 'setHeader', catalogKind: CatalogKind.Pattern },
      });
      const model = camelRoute.route.from.steps[1].setHeader;

      const result = await ModelValidationService.validateNodeStatus(schema!, model);

      expect(result).toBe('2 required parameters are not yet configured: [ expression,name ]');
    });

    it('should return a validation text for setheader with a different model dialect', async () => {
      const schema = await camelEntity.fetchNodeSchema({
        primaryNodeId: { name: 'setHeader', catalogKind: CatalogKind.Pattern },
      });
      const model = {
        name: 'test',
        constant: 'Hello Camel',
      };

      const result = await ModelValidationService.validateNodeStatus(schema!, model);

      expect(result).toBe('');
    });

    it('should return an empty string if there is no missing property', async () => {
      const schema = await camelEntity.fetchNodeSchema({
        primaryNodeId: { name: 'to', catalogKind: CatalogKind.Pattern },
        secondaryNodeId: { name: 'activemq', catalogKind: CatalogKind.Component },
      });
      const model = { ...camelRoute.route.from.steps[0].to, parameters: { destinationName: 'myQueue' } };

      const result = await ModelValidationService.validateNodeStatus(schema!, model);

      expect(result).toBe('');
    });

    it('should return an empty string if the schema is undefined', async () => {
      const result = await ModelValidationService.validateNodeStatus(
        undefined as unknown as KaotoSchemaDefinition['schema'],
        {},
      );

      expect(result).toBe('');
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

    it('should report missing required array property when not present', async () => {
      const model = {};
      const result = await ModelValidationService.validateNodeStatus(arraySchema, model);
      expect(result).toBe('1 required parameter is not yet configured: [ items ]');
    });

    it('should report missing required array property when empty', async () => {
      const model = { items: [] };
      const result = await ModelValidationService.validateNodeStatus(arraySchema, model);
      expect(result).toBe('1 required parameter is not yet configured: [ items ]');
    });

    it('should not report missing required array property when array is non-empty', async () => {
      const model = { items: [1, 2, 3] };
      const result = await ModelValidationService.validateNodeStatus(arraySchema, model);
      expect(result).toBe('');
    });
  });
});
