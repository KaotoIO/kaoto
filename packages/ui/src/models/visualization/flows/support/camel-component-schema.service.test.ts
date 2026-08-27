import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { DATAMAPPER_ID_PREFIX } from '../../../../utils';
import { CatalogKind } from '../../../catalog-kind';
import { IVisualizationNodeIds } from '../../base-visual-entity';
import { IClipboardContent } from '../../clipboard';
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

  describe('getUpdatedDefinition', () => {
    const textBasedProcessors: [IVisualizationNodeIds, string, object][] = [
      [
        {
          primaryNodeId: { name: 'to', catalogKind: CatalogKind.Pattern },
          secondaryNodeId: { name: 'bean', catalogKind: CatalogKind.Component },
        },
        'bean:myBean?method=hello',
        {
          uri: 'bean',
          parameters: {
            beanName: 'myBean',
            method: 'hello',
          },
        },
      ],
      [
        {
          primaryNodeId: { name: 'toD', catalogKind: CatalogKind.Pattern },
          secondaryNodeId: { name: 'bean', catalogKind: CatalogKind.Component },
        },
        'bean:myBean?method=hello',
        {
          uri: 'bean',
          parameters: {
            beanName: 'myBean',
            method: 'hello',
          },
        },
      ],
      [
        {
          primaryNodeId: { name: 'log', catalogKind: CatalogKind.Pattern },
        },
        '${body}',
        {
          message: '${body}',
        },
      ],
    ];

    it.each(textBasedProcessors)('should transform string-based processors', (ids, definition, expectedResult) => {
      const result = CamelComponentSchemaService.getUpdatedDefinition(ids, definition);

      expect(result).toMatchObject(expectedResult);
    });

    it(`should clone the component's definition`, () => {
      const toLogDefinition = {
        id: 'to-3044',
        uri: 'log',
        parameters: {
          groupActiveOnly: true,
          logMask: true,
          level: 'ERROR',
        },
      };

      const result = CamelComponentSchemaService.getUpdatedDefinition(
        {
          primaryNodeId: { name: 'to', catalogKind: CatalogKind.Pattern },
          secondaryNodeId: { name: 'log', catalogKind: CatalogKind.Component },
        },
        toLogDefinition,
      );

      expect(result).not.toBe(toLogDefinition);
      expect(result).toEqual(toLogDefinition);
    });

    it(`should not apply missing syntax's path segments`, () => {
      const toLogDefinition = {
        uri: 'timer',
      };

      const result = CamelComponentSchemaService.getUpdatedDefinition(
        {
          primaryNodeId: { name: 'from', catalogKind: CatalogKind.Entity },
          secondaryNodeId: { name: 'timer', catalogKind: CatalogKind.Component },
        },
        toLogDefinition,
      );

      expect(result.uri).toBe('timer');
      expect(result.parameters).toEqual({});
    });

    it('should not build a schema for an unknown component', () => {
      const camelCatalogServiceSpy = vi.spyOn(CamelCatalogService, 'getComponent');
      const toNonExistingDefinition = {
        id: 'to-3044',
        uri: 'non-existing-component',
        parameters: {
          level: 'ERROR',
        },
      };

      const result = CamelComponentSchemaService.getUpdatedDefinition(
        {
          primaryNodeId: { name: 'to', catalogKind: CatalogKind.Pattern },
          secondaryNodeId: { name: 'non-existing-component', catalogKind: CatalogKind.Component },
        },
        toNonExistingDefinition,
      );

      expect(camelCatalogServiceSpy).toHaveBeenCalledTimes(1);
      expect(camelCatalogServiceSpy).toHaveBeenNthCalledWith(1, CatalogKind.Component, 'non-existing-component');
      expect(camelCatalogServiceSpy).toHaveBeenNthCalledWith(1, CatalogKind.Component, 'non-existing-component');
      expect(result).toEqual({
        id: 'to-3044',
        parameters: {
          level: 'ERROR',
        },
        uri: 'non-existing-component',
      });
    });
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

  describe('getComponentNameFromUri', () => {
    it.each([
      ['', undefined],
      ['kamelet:beer-source', 'kamelet:beer-source'],
      ['kamelet:beer-source?foo=bar', 'kamelet:beer-source'],
      ['timer:foo?delay=1000&period=1000', 'timer'],
      ['timer', 'timer'],
    ] as [string, string | undefined][])(`should return the component name from '%s'`, (uri, expected) => {
      const componentName = CamelComponentSchemaService.getComponentNameFromUri(uri);
      expect(componentName).toBe(expected);
    });
  });

  describe('getNodeDefinitionValue', () => {
    it('should return Node definition for a simple processor', () => {
      const clipboadContent: IClipboardContent = {
        name: 'log',
        definition: {
          id: 'log-3245',
          message: '${body}',
        },
      };
      const expectedValue = CamelComponentSchemaService.getNodeDefinitionValue(clipboadContent);
      expect(expectedValue).toEqual({ log: { id: 'log-3245', message: '${body}' } });
    });

    it('should return Node definition for a Special processor', () => {
      const clipboadContent: IClipboardContent = {
        name: 'when',
        definition: {
          id: 'when-2765',
          steps: [{ log: { id: 'log-2202', message: '${body}' } }],
        },
      };
      const expectedValue = CamelComponentSchemaService.getNodeDefinitionValue(clipboadContent);
      expect(expectedValue).toEqual({ id: 'when-2765', steps: [{ log: { id: 'log-2202', message: '${body}' } }] });
    });
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
