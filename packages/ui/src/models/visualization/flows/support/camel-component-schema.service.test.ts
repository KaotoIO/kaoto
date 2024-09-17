import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { CamelUriHelper, ROOT_PATH } from '../../../../utils';
import { ICamelProcessorDefinition } from '../../../camel-processors-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { NodeLabelType } from '../../../settings/settings.model';
import { CamelCatalogService } from '../camel-catalog.service';
import { CamelComponentSchemaService } from './camel-component-schema.service';
import { CamelProcessorStepsProperties } from './camel-component-types';

describe('CamelComponentSchemaService', () => {
  let path: string;
  let definition: { uri: string };
  let modelCatalogMap = {} as Record<string, ICamelProcessorDefinition>;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    modelCatalogMap = catalogsMap.modelCatalogMap;
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, catalogsMap.kameletsCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
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
        schema: {},
        definition,
      });
    });

    it('should clone the component processor schema to avoid mutating the original one', () => {
      const result = CamelComponentSchemaService.getVisualComponentSchema('from', definition);

      expect(result!.schema).not.toBe(modelCatalogMap.from.propertiesSchema);
    });

    it('should build the appropriate schema for `route` entity', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');
      const rootPath = ROOT_PATH;
      const routeDefinition = { id: 'route-1234', from: { uri: 'timer:MyTimer?period=1000' } };

      const result = CamelComponentSchemaService.getVisualComponentSchema(rootPath, routeDefinition);

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Entity, 'route');
      expect(result).toMatchSnapshot();
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
      [ROOT_PATH, { from: { uri: 'timer:foo?delay=1000&period=1000' } }, { processorName: 'route' }],
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
      [
        { processorName: 'route' as keyof ProcessorDefinition },
        { id: 'route-1234', description: 'My Route description', from: { uri: 'timer:foo' } },
        'My Route description',
      ],
      [
        { processorName: 'route' as keyof ProcessorDefinition },
        { id: 'route-1234', from: { uri: 'timer:foo', description: '' } },
        'route-1234',
      ],
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
      [{ processorName: 'from' as keyof ProcessorDefinition, id: 'from-1234', uri: '' }, {}, 'from: Unknown'],
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
      [
        { processorName: 'errorHandler' as keyof ProcessorDefinition },
        { id: 'errorHandler-1234', description: 'Error Handler' },
        'Error Handler',
      ],
      [
        { processorName: 'errorHandler' as keyof ProcessorDefinition },
        { id: 'errorHandler-1234' },
        'errorHandler-1234',
      ],
      [
        { processorName: 'onException' as keyof ProcessorDefinition },
        { id: 'onException-1234', description: 'On Exception' },
        'On Exception',
      ],
      [{ processorName: 'onException' as keyof ProcessorDefinition }, { id: 'onException-1234' }, 'onException-1234'],
      [
        { processorName: 'onCompletion' as keyof ProcessorDefinition },
        { id: 'onCompletion-1234', description: 'On Completion' },
        'On Completion',
      ],
      [
        { processorName: 'onCompletion' as keyof ProcessorDefinition },
        { id: 'onCompletion-1234' },
        'onCompletion-1234',
      ],
      [
        { processorName: 'intercept' as keyof ProcessorDefinition },
        { id: 'intercept-1234', description: 'Intercept' },
        'Intercept',
      ],
      [{ processorName: 'intercept' as keyof ProcessorDefinition }, { id: 'intercept-1234' }, 'intercept-1234'],
      [
        { processorName: 'interceptFrom' as keyof ProcessorDefinition },
        { id: 'interceptFrom-1234', description: 'InterceptFrom' },
        'InterceptFrom',
      ],
      [
        { processorName: 'interceptFrom' as keyof ProcessorDefinition },
        { id: 'interceptFrom-1234' },
        'interceptFrom-1234',
      ],
      [
        { processorName: 'interceptSendToEndpoint' as keyof ProcessorDefinition },
        { id: 'interceptSendToEndpoint-1234', description: 'InterceptSendToEndpoint' },
        'InterceptSendToEndpoint',
      ],
      [
        { processorName: 'interceptSendToEndpoint' as keyof ProcessorDefinition },
        { id: 'interceptSendToEndpoint-1234' },
        'interceptSendToEndpoint-1234',
      ],
      [{ processorName: 'step' }, { id: 'kaoto-datamapper-1234' }, 'kaoto-datamapper-1234'],
      [{ processorName: 'step' }, { id: 'step-1234' }, 'step-1234'],
    ] as const)(
      'should return the processor name if the component name is not provided: %s [%s]',
      (componentLookup, definition, result) => {
        const label = CamelComponentSchemaService.getNodeLabel(componentLookup, definition);

        expect(label).toEqual(result);
      },
    );

    it('should favor `id` when asked for the label', () => {
      const label = CamelComponentSchemaService.getNodeLabel(
        { processorName: 'to', componentName: 'log' },
        { id: 'to-1234', description: 'My Logger', uri: 'log' },
        NodeLabelType.Id,
      );

      expect(label).toEqual('to-1234');
    });

    it('should favor `description` when asked for the label', () => {
      const label = CamelComponentSchemaService.getNodeLabel(
        { processorName: 'to', componentName: 'log' },
        { id: 'to-1234', description: 'My Logger', uri: 'log' },
        NodeLabelType.Description,
      );

      expect(label).toEqual('My Logger');
    });
  });

  describe('getTooltipContent', () => {
    it('should return the component schema description', () => {
      const camelElementLookup = { processorName: 'from' as keyof ProcessorDefinition, componentName: 'timer' };
      const actualContent = CamelComponentSchemaService.getTooltipContent(camelElementLookup);

      expect(actualContent).toEqual('Generate messages in specified intervals using java.util.Timer.');
    });

    it('should return the component name', () => {
      const camelElementLookup = { processorName: 'from' as keyof ProcessorDefinition, componentName: 'xyz' };
      const actualContent = CamelComponentSchemaService.getTooltipContent(camelElementLookup);

      expect(actualContent).toEqual('xyz');
    });

    it('should return the kamelet schema description', () => {
      const camelElementLookup = {
        processorName: 'to' as keyof ProcessorDefinition,
        componentName: 'kamelet:avro-deserialize-action',
      };
      const actualContent = CamelComponentSchemaService.getTooltipContent(camelElementLookup);

      expect(actualContent).toEqual('Deserialize payload to Avro');
    });

    it('should return the kamelet name', () => {
      const camelElementLookup = {
        processorName: 'to' as keyof ProcessorDefinition,
        componentName: 'kamelet:xyz',
      };
      const actualContent = CamelComponentSchemaService.getTooltipContent(camelElementLookup);

      expect(actualContent).toEqual('To call Kamelets');
    });

    it('should return the processor schema description', () => {
      const path = 'from.steps.0.aggregate';
      const definition = { id: 'aggregate-2202' };
      const camelElementLookup = CamelComponentSchemaService.getCamelComponentLookup(path, definition);
      const actualContent = CamelComponentSchemaService.getTooltipContent(camelElementLookup);

      expect(actualContent).toEqual('Aggregates many messages into a single message');
    });

    it('should return the processor name', () => {
      const path = 'from.steps.0.xyz';
      const definition = { id: 'xyz-2202' };
      const camelElementLookup = CamelComponentSchemaService.getCamelComponentLookup(path, definition);
      const actualContent = CamelComponentSchemaService.getTooltipContent(camelElementLookup);

      expect(actualContent).toEqual('xyz');
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

  describe('getMultiValueSerializedDefinition', () => {
    it('should return the same parameters if the definition is not a component', () => {
      const definition = { log: { message: 'Hello World' } };
      const result = CamelComponentSchemaService.getMultiValueSerializedDefinition('from', definition);

      expect(result).toEqual(definition);
    });

    it('should return the same parameters if the component is not found', () => {
      const definition = {
        uri: 'unknown-component',
        parameters: { jobParameters: { test: 'test' }, triggerParameters: { test: 'test' } },
      };
      const result = CamelComponentSchemaService.getMultiValueSerializedDefinition('from', definition);

      expect(result).toEqual(definition);
    });

    it('should query the catalog service', () => {
      const definition = { uri: 'log', parameters: { message: 'Hello World' } };
      const catalogServiceSpy = jest.spyOn(CamelCatalogService, 'getCatalogLookup');

      CamelComponentSchemaService.getMultiValueSerializedDefinition('from', definition);
      expect(catalogServiceSpy).toHaveBeenCalledWith('log');
    });

    it('should return the serialized definition', () => {
      const definition = {
        uri: 'quartz',
        parameters: { jobParameters: { test: 'test' }, triggerParameters: { test: 'test' } },
      };
      const result = CamelComponentSchemaService.getMultiValueSerializedDefinition('from', definition);

      expect(result).toEqual({ uri: 'quartz', parameters: { 'job.test': 'test', 'trigger.test': 'test' } });
    });
  });

  describe('getUriSerializedDefinition', () => {
    it('should return the same parameters if the definition is not a component', () => {
      const definition = { log: { message: 'Hello World' } };
      const result = CamelComponentSchemaService.getUriSerializedDefinition('from', definition);

      expect(result).toEqual(definition);
    });

    it('should return the same parameters if the component is not found', () => {
      const definition = { uri: 'unknown-component' };
      const result = CamelComponentSchemaService.getUriSerializedDefinition('from', definition);

      expect(result).toEqual(definition);
    });

    it('should query the catalog service and generate the required parameters array', () => {
      const definition = { uri: 'log', parameters: { message: 'Hello World' } };
      const catalogServiceSpy = jest.spyOn(CamelCatalogService, 'getCatalogLookup');
      const camelUriHelperSpy = jest.spyOn(CamelUriHelper, 'getUriStringFromParameters');

      CamelComponentSchemaService.getUriSerializedDefinition('from', definition);

      expect(catalogServiceSpy).toHaveBeenCalledWith('log');
      expect(camelUriHelperSpy).toHaveBeenCalledWith(definition.uri, 'log:loggerName', definition.parameters, {
        requiredParameters: ['loggerName'],
        defaultValues: {
          groupActiveOnly: 'true',
          level: 'INFO',
          maxChars: 10000,
          showBody: true,
          showBodyType: true,
          showCachedStreams: true,
          skipBodyLineSeparator: true,
          style: 'Default',
        },
      });
    });

    it('should return the serialized definition', () => {
      const definition = { uri: 'timer', parameters: { timerName: 'MyTimer', delay: '1000', repeatCount: 10 } };
      const result = CamelComponentSchemaService.getUriSerializedDefinition('from', definition);

      expect(result).toEqual({ uri: 'timer:MyTimer', parameters: { delay: '1000', repeatCount: 10 } });
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
