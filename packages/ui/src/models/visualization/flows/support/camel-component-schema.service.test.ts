import * as catalogIndex from '@kaoto-next/camel-catalog/index.json';
import { ProcessorDefinition } from '@kaoto-next/camel-catalog/types';
import { CatalogKind } from '../../../catalog-kind';
import { CamelCatalogService } from '../camel-catalog.service';
import { CamelComponentSchemaService } from './camel-component-schema.service';
import { ICamelComponentDefinition } from '../../../camel-components-catalog';
import { ICamelProcessorDefinition } from '../../../camel-processors-catalog';
import { IKameletDefinition } from '../../../kamelets-catalog';

describe('CamelComponentSchemaService', () => {
  let path: string;
  let definition: { uri: string };
  let modelCatalogMap = {} as Record<string, ICamelProcessorDefinition>;

  beforeAll(async () => {
    const componentCatalogMap = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.components.file);
    modelCatalogMap = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.models.file);
    const patternCatalogMap = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.patterns.file);
    const kameletCatalogMap = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.kamelets.file);
    CamelCatalogService.setCatalogKey(
      CatalogKind.Component,
      componentCatalogMap as unknown as Record<string, ICamelComponentDefinition>,
    );
    CamelCatalogService.setCatalogKey(
      CatalogKind.Processor,
      modelCatalogMap as unknown as Record<string, ICamelProcessorDefinition>,
    );
    CamelCatalogService.setCatalogKey(
      CatalogKind.Pattern,
      patternCatalogMap as unknown as Record<string, ICamelProcessorDefinition>,
    );
    CamelCatalogService.setCatalogKey(
      CatalogKind.Kamelet,
      kameletCatalogMap as unknown as Record<string, IKameletDefinition>,
    );
  });

  beforeEach(() => {
    path = 'from';
    definition = { uri: 'timer:foo?delay=1000&period=1000' };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
  });

  describe('getVisualComponentSchema', () => {
    it('should leverage the getCamelComponentLookup method', () => {
      const getCamelComponentLookupSpy = jest.spyOn(CamelComponentSchemaService, 'getCamelComponentLookup');
      CamelComponentSchemaService.getVisualComponentSchema(path, definition);

      expect(getCamelComponentLookupSpy).toHaveBeenCalledWith(path, definition);
    });

    it('should return an empty schema when the processor it is not found', () => {
      jest
        .spyOn(CamelComponentSchemaService, 'getCamelComponentLookup')
        .mockReturnValueOnce({ processorName: 'non-existing-processor' as keyof ProcessorDefinition });
      const result = CamelComponentSchemaService.getVisualComponentSchema(path, definition);

      expect(result).toEqual({
        title: 'non-existing-processor',
        schema: {},
        definition,
      });
    });

    it('should clone the component processor schema to avoid mutating the original one', () => {
      const result = CamelComponentSchemaService.getVisualComponentSchema('from', definition);

      expect(result!.schema).not.toBe(modelCatalogMap.from.propertiesSchema);
    });

    it('should build the appropriate schema for standalone processors', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');
      const logPath = 'from.steps.0.log';
      const logDefinition = { message: 'Hello World' };

      const result = CamelComponentSchemaService.getVisualComponentSchema(logPath, logDefinition);

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Pattern, 'log');
      expect(result).toMatchSnapshot();
    });

    it('should build the appropriate schema for processors combined that holds a component', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');
      const toLogPath = 'from.steps.0.to';
      const toLogDefinition = {
        id: 'to-3044',
        uri: 'log',
        parameters: {
          groupActiveOnly: true,
          logMask: true,
          level: 'ERROR',
        },
      };

      const result = CamelComponentSchemaService.getVisualComponentSchema(toLogPath, toLogDefinition);

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Pattern, 'to');
      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Component, 'log');
      expect(result).toMatchSnapshot();
    });

    it('should transform a string-based `To` processor', () => {
      const toBeanPath = 'from.steps.0.to';
      const toBeanDefinition = 'bean:myBean?method=hello';

      const result = CamelComponentSchemaService.getVisualComponentSchema(toBeanPath, toBeanDefinition);

      expect(result).toMatchSnapshot();
    });

    it('should transform a string-based `ToD` processor', () => {
      const toDBeanPath = 'from.steps.0.toD';
      const toDBeanDefinition = 'bean:myBean?method=hello';

      const result = CamelComponentSchemaService.getVisualComponentSchema(toDBeanPath, toDBeanDefinition);

      expect(result).toMatchSnapshot();
    });

    it('should transform a string-based `Log` processor', () => {
      const logPath = 'from.steps.0.log';
      const logDefinition = '${body}';

      const result = CamelComponentSchemaService.getVisualComponentSchema(logPath, logDefinition);

      expect(result).toMatchSnapshot();
    });

    it(`should clone the component's definition`, () => {
      const toLogPath = 'from.steps.0.to';
      const toLogDefinition = {
        id: 'to-3044',
        uri: 'log',
        parameters: {
          groupActiveOnly: true,
          logMask: true,
          level: 'ERROR',
        },
      };

      const result = CamelComponentSchemaService.getVisualComponentSchema(toLogPath, toLogDefinition);

      expect(result!.definition).not.toBe(toLogDefinition);
      expect(result!.definition).toEqual(toLogDefinition);
    });

    it(`should parse and clean the component's URI field`, () => {
      const toLogPath = 'from';
      const toLogDefinition = {
        uri: 'timer:timer-1?period=5000&delay=5&synchronous=true',
      };

      const result = CamelComponentSchemaService.getVisualComponentSchema(toLogPath, toLogDefinition);

      expect(result!.definition.uri).toEqual('timer');
      expect(result!.definition.parameters).toEqual({
        timerName: 'timer-1',
        period: 5000,
        delay: 5,
        synchronous: true,
      });
    });

    it(`should not apply missing syntax's path segments`, () => {
      const toLogPath = 'from';
      const toLogDefinition = {
        uri: 'timer',
      };

      const result = CamelComponentSchemaService.getVisualComponentSchema(toLogPath, toLogDefinition);

      expect(result!.definition.uri).toEqual('timer');
      expect(result!.definition.parameters).toEqual({});
    });

    it(`should create the parameters property if not exists`, () => {
      const toLogPath = 'from';
      const toLogDefinition = {
        uri: 'timer',
      };

      const result = CamelComponentSchemaService.getVisualComponentSchema(toLogPath, toLogDefinition);

      expect(result!.definition.parameters).not.toBeUndefined();
    });

    it('should not build a schema for an unknown component', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');
      const toNonExistingPath = 'from.steps.0.to';
      const toNonExistingDefinition = {
        id: 'to-3044',
        uri: 'non-existing-component',
        parameters: {
          level: 'ERROR',
        },
      };

      const result = CamelComponentSchemaService.getVisualComponentSchema(toNonExistingPath, toNonExistingDefinition);

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Pattern, 'to');
      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Component, 'non-existing-component');
      expect(result).toMatchSnapshot();
    });
  });

  describe('getCamelComponentLookup', () => {
    it.each([
      ['from', { uri: 'timer:foo?delay=1000&period=1000' }, { processorName: 'from', componentName: 'timer' }],
      ['from.steps.0.to', { uri: 'log' }, { processorName: 'to', componentName: 'log' }],
      ['from.steps.1.toD', { uri: 'log' }, { processorName: 'toD', componentName: 'log' }],
      ['from.steps.0.to', 'log', { processorName: 'to', componentName: 'log' }],
      ['from.steps.1.toD', 'log', { processorName: 'toD', componentName: 'log' }],
      ['from.steps.2.log', { message: 'Hello World' }, { processorName: 'log' }],
      ['from.steps.3.choice', {}, { processorName: 'choice' }],
      ['from.steps.3.choice.when.0', {}, { processorName: 'when' }],
      ['from.steps.3.choice.otherwise', {}, { processorName: 'otherwise' }],
      ['from.steps.3.choice.otherwise', undefined, { processorName: 'otherwise' }],
    ])('should return the processor and component name for %s', (path, definition, result) => {
      const camelElementLookup = CamelComponentSchemaService.getCamelComponentLookup(path, definition);

      expect(camelElementLookup).toEqual(result);
    });
  });

  describe('getNodeLabel', () => {
    it('should return the component name if provided', () => {
      const label = CamelComponentSchemaService.getNodeLabel(
        { processorName: 'from' as keyof ProcessorDefinition, componentName: 'timer' },
        {},
      );

      expect(label).toEqual('timer');
    });

    it.each([
      [{ processorName: 'from' as keyof ProcessorDefinition }, { uri: 'timer:foo', description: '' }, 'timer:foo'],
      [
        { processorName: 'from' as keyof ProcessorDefinition },
        { uri: 'timer:foo', description: 'this is a description' },
        'this is a description',
      ],
      [
        { processorName: 'from' as keyof ProcessorDefinition },
        { uri: 'timer:foo?delay=1000&period=1000' },
        'timer:foo?delay=1000&period=1000',
      ],
      [{ processorName: 'from' as keyof ProcessorDefinition }, {}, 'from: Unknown'],
      [{ processorName: 'from' as keyof ProcessorDefinition, uri: '' }, {}, 'from: Unknown'],
      [{ processorName: 'from' as keyof ProcessorDefinition, uri: null }, {}, 'from: Unknown'],
      [{ processorName: 'from' as keyof ProcessorDefinition, uri: 10 }, {}, 'from: Unknown'],
      [{ processorName: 'from' as keyof ProcessorDefinition, uri: undefined }, {}, 'from: Unknown'],
      [{ processorName: 'to' as keyof ProcessorDefinition }, 'timer:foo', 'timer:foo'],
      [{ processorName: 'to' as keyof ProcessorDefinition }, { uri: 'timer:foo' }, 'timer:foo'],
      [{ processorName: 'to' as keyof ProcessorDefinition }, {}, 'to'],
      [{ processorName: 'to' as keyof ProcessorDefinition }, undefined, 'to'],
      [{ processorName: 'to' as keyof ProcessorDefinition }, null, 'to'],
      [{ processorName: 'to' as keyof ProcessorDefinition }, '', 'to'],
      [{ processorName: 'toD' as keyof ProcessorDefinition }, 'timer:foo', 'timer:foo'],
      [{ processorName: 'toD' as keyof ProcessorDefinition }, { uri: 'timer:foo' }, 'timer:foo'],
      [{ processorName: 'toD' as keyof ProcessorDefinition }, {}, 'toD'],
      [{ processorName: 'toD' as keyof ProcessorDefinition }, undefined, 'toD'],
      [{ processorName: 'toD' as keyof ProcessorDefinition }, null, 'toD'],
      [{ processorName: 'toD' as keyof ProcessorDefinition }, '', 'toD'],
      [{ processorName: 'choice' as keyof ProcessorDefinition }, {}, 'choice'],
      [{ processorName: 'otherwise' as keyof ProcessorDefinition }, {}, 'otherwise'],
    ])(
      'should return the processor name if the component name is not provided: %s [%s]',
      (componentLookup, definition, result) => {
        const label = CamelComponentSchemaService.getNodeLabel(componentLookup, definition);

        expect(label).toEqual(result);
      },
    );
  });

  describe('getTooltipContent', () => {
    it('should return the schema description if provided', () => {
      const path = 'from.steps.0.to';
      const definition = { uri: 'log' };

      const camelElementLookup = CamelComponentSchemaService.getCamelComponentLookup(path, definition);
      const actualContent = CamelComponentSchemaService.getTooltipContent(camelElementLookup);
      const expectedContent = CamelComponentSchemaService.getVisualComponentSchema(path, definition)?.schema
        .description;

      expect(actualContent).toEqual(expectedContent);
    });

    it('should return the component name if provided', () => {
      const actualContent = CamelComponentSchemaService.getTooltipContent({
        processorName: 'from' as keyof ProcessorDefinition,
        componentName: 'test',
      });

      expect(actualContent).toEqual('test');
    });

    it('should return the processor name', () => {
      const path = 'from';
      const definition = {};
      const camelElementLookup = CamelComponentSchemaService.getCamelComponentLookup(path, definition);
      const actualContent = CamelComponentSchemaService.getTooltipContent(camelElementLookup);
      const ExpectedContent = camelElementLookup.processorName;

      expect(actualContent).toEqual(ExpectedContent);
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

  describe('getProcessorStepsProperties', () => {
    it.each([
      ['from', [{ name: 'steps', type: 'branch' }]],
      ['when', [{ name: 'steps', type: 'branch' }]],
      ['otherwise', [{ name: 'steps', type: 'branch' }]],
      ['doCatch', [{ name: 'steps', type: 'branch' }]],
      ['doFinally', [{ name: 'steps', type: 'branch' }]],
      ['aggregate', [{ name: 'steps', type: 'branch' }]],
      ['onFallback', [{ name: 'steps', type: 'branch' }]],
      ['saga', [{ name: 'steps', type: 'branch' }]],
      [
        'choice',
        [
          { name: 'when', type: 'clause-list' },
          { name: 'otherwise', type: 'single-clause' },
        ],
      ],
      [
        'doTry',
        [
          { name: 'steps', type: 'branch' },
          { name: 'doCatch', type: 'clause-list' },
          { name: 'doFinally', type: 'single-clause' },
        ],
      ],
      ['to', []],
      ['toD', []],
      ['log', []],
    ])(`should return the steps properties for '%s'`, (processorName, result) => {
      const stepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
        processorName as keyof ProcessorDefinition,
      );

      expect(stepsProperties).toEqual(result);
    });
  });

  describe('getIconName', () => {
    it('should return the component name if provided', () => {
      const iconName = CamelComponentSchemaService.getIconName({
        processorName: 'from' as keyof ProcessorDefinition,
        componentName: 'timer',
      });

      expect(iconName).toEqual('timer');
    });

    it('should return the kamelet name if provided', () => {
      const iconName = CamelComponentSchemaService.getIconName({
        processorName: 'from' as keyof ProcessorDefinition,
        componentName: 'kamelet:beer-source',
      });

      expect(iconName).toEqual('kamelet:beer-source');
    });

    it('should return the processor name if the component name is not provided', () => {
      const iconName = CamelComponentSchemaService.getIconName({
        processorName: 'log',
      });

      expect(iconName).toEqual('log');
    });

    it('should return an empty string if the component cannot be found', () => {
      const iconName = CamelComponentSchemaService.getIconName({
        processorName: 'to',
        componentName: 'unknown-component',
      });

      expect(iconName).toEqual('');
    });

    it('should return an empty string if the processor cannot be found', () => {
      const iconName = CamelComponentSchemaService.getIconName({
        processorName: 'non-existing-processor' as keyof ProcessorDefinition,
      });

      expect(iconName).toEqual('');
    });
  });

  describe('getComponentNameFromUri', () => {
    it('should return undefined if the uri is empty', () => {
      const componentName = CamelComponentSchemaService.getComponentNameFromUri('');
      expect(componentName).toBeUndefined();
    });

    it('should return the kamelet component name', () => {
      const uri = 'kamelet:beer-source';
      const componentName = CamelComponentSchemaService.getComponentNameFromUri(uri);
      expect(componentName).toEqual('kamelet:beer-source');
    });

    it('should return the kamelet component name when having query parameters', () => {
      const uri = 'kamelet:beer-source?foo=bar';
      const componentName = CamelComponentSchemaService.getComponentNameFromUri(uri);
      expect(componentName).toEqual('kamelet:beer-source');
    });

    it('should return the component name from the uri', () => {
      const uri = 'timer:foo?delay=1000&period=1000';
      const componentName = CamelComponentSchemaService.getComponentNameFromUri(uri);
      expect(componentName).toEqual('timer');
    });
  });
});
