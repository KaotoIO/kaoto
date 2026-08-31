import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { DATAMAPPER_ID_PREFIX } from '../../../../utils';
import { CatalogKind } from '../../../catalog-kind';
import { CamelCatalogService } from '../camel-catalog.service';
import { CamelComponentSchemaService } from './camel-component-schema.service';
import { CamelProcessorStepsProperties } from './camel-component-types';

describe('CamelComponentSchemaService', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, catalogsMap.kameletsCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
  });

  describe('canHavePreviousStep', () => {
    it.each([
      ['from', false],
      ['when', false],
      ['otherwise', false],
      ['doCatch', false],
      ['doFinally', false],
      ['aggregate', true],
      ['onFallback', true],
      ['saga', true],
    ])('should return whether the %s processor could have a previous step', (processorName, result) => {
      const canHavePreviousStep = CamelComponentSchemaService.canHavePreviousStep(
        processorName as keyof ProcessorDefinition,
      );

      expect(canHavePreviousStep).toEqual(result);
    });
  });

  describe('canReplaceStep', () => {
    it.each([
      ['from', true],
      ['when', false],
      ['otherwise', false],
      ['doCatch', false],
      ['doFinally', false],
      ['intercept', false],
      ['interceptFrom', false],
      ['interceptSendToEndpoint', false],
      ['onException', false],
      ['onCompletion', false],
      ['aggregate', true],
      ['onFallback', true],
      ['saga', true],
    ])('should return whether the %s processor could be replaced', (processorName, result) => {
      const canBeReplaced = CamelComponentSchemaService.canReplaceStep(processorName as keyof ProcessorDefinition);

      expect(canBeReplaced).toEqual(result);
    });
  });

  describe('getProcessorStepsProperties', () => {
    it.each([
      ['from', [{ name: 'steps', type: 'branch' }]],
      ['when', [{ name: 'steps', type: 'branch' }]],
      ['otherwise', [{ name: 'steps', type: 'branch' }]],
      ['doCatch', [{ name: 'steps', type: 'branch' }]],
      ['doFinally', [{ name: 'steps', type: 'branch' }]],
      ['aggregate', [{ name: 'steps', type: 'branch' }]],
      [
        'circuitBreaker',
        [
          { name: 'steps', type: 'branch' },
          { name: 'onFallback', type: 'single-clause' },
        ],
      ],
      ['onFallback', [{ name: 'steps', type: 'branch' }]],
      ['saga', [{ name: 'steps', type: 'branch' }]],
      [
        'choice',
        [
          { name: 'when', type: 'array-clause' },
          { name: 'otherwise', type: 'single-clause' },
        ],
      ],
      [
        'doTry',
        [
          { name: 'steps', type: 'branch' },
          { name: 'doCatch', type: 'array-clause' },
          { name: 'doFinally', type: 'single-clause' },
        ],
      ],
      ['to', []],
      ['toD', []],
      ['log', []],
      [
        'routeConfiguration',
        [
          { name: 'intercept', type: 'array-clause' },
          { name: 'interceptFrom', type: 'array-clause' },
          { name: 'interceptSendToEndpoint', type: 'array-clause' },
          { name: 'onException', type: 'array-clause' },
          { name: 'onCompletion', type: 'array-clause' },
        ],
      ],
      ['intercept', [{ name: 'steps', type: 'branch' }]],
      ['interceptFrom', [{ name: 'steps', type: 'branch' }]],
      ['interceptSendToEndpoint', [{ name: 'steps', type: 'branch' }]],
      ['onException', [{ name: 'steps', type: 'branch' }]],
      ['onCompletion', [{ name: 'steps', type: 'branch' }]],
      [
        'rest',
        [
          { name: 'get', type: 'array-clause' },
          { name: 'post', type: 'array-clause' },
          { name: 'put', type: 'array-clause' },
          { name: 'delete', type: 'array-clause' },
          { name: 'patch', type: 'array-clause' },
          { name: 'head', type: 'array-clause' },
        ],
      ],
      ['get', [{ name: 'to', type: 'single-clause' }]],
      ['post', [{ name: 'to', type: 'single-clause' }]],
      ['put', [{ name: 'to', type: 'single-clause' }]],
      ['delete', [{ name: 'to', type: 'single-clause' }]],
      ['patch', [{ name: 'to', type: 'single-clause' }]],
      ['head', [{ name: 'to', type: 'single-clause' }]],
    ] as [string, CamelProcessorStepsProperties[]][])(
      `should return the steps properties for '%s'`,
      (processorName, result) => {
        const stepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
          processorName as keyof ProcessorDefinition,
        );

        expect(stepsProperties).toEqual(result);
      },
    );
  });

  describe('canBeDisabled', () => {
    it('should allow disabling DataMapper', () => {
      const result = CamelComponentSchemaService.canBeDisabled(DATAMAPPER_ID_PREFIX);

      expect(result).toBe(true);
    });

    it('should allow disabling processors that define disabled in schema', () => {
      const result = CamelComponentSchemaService.canBeDisabled('log' as keyof ProcessorDefinition);

      expect(result).toBe(true);
    });

    it('should not allow disabling processors without disabled property', () => {
      const result = CamelComponentSchemaService.canBeDisabled('from' as keyof ProcessorDefinition);

      expect(result).toBe(false);
    });
  });
});
