import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { DATAMAPPER_ID_PREFIX, XSLT_COMPONENT_NAME } from '../../../../utils';
import { ICamelProcessorDefinition } from '../../../camel-processors-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { NodeLabelType } from '../../../settings/settings.model';
import { CamelCatalogService } from '../camel-catalog.service';
import { CamelComponentSchemaService } from './camel-component-schema.service';
import { CamelProcessorStepsProperties, ICamelElementLookupResult } from './camel-component-types';
import { IClipboardCopyObject } from '../../clipboard';
import { SourceSchemaType } from '../../../camel/source-schema-type';
import { ICamelComponentDefinition } from '../../../camel-components-catalog';

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
    definition = { uri: 'timer' };
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
      const rootPath = 'route';
      const routeDefinition = {
        id: 'route-1234',
        from: {
          uri: 'timer',
          parameters: {
            timerName: 'tutorial',
          },
        },
      };

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

    it('should build the appropriate schema without any producer parameters', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');
      const Path = 'from';
      const routeDefinition = {
        uri: 'file',
        parameters: {},
      };

      const result = CamelComponentSchemaService.getVisualComponentSchema(Path, routeDefinition);

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Entity, 'from');
      expect(result).toMatchSnapshot();
    });

    it('should build the appropriate schema without any consumer parameters', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');
      const toFilePath = 'from.steps.0.to';
      const toFileDefinition = {
        id: 'to-3044',
        uri: 'file',
        parameters: {},
      };

      const result = CamelComponentSchemaService.getVisualComponentSchema(toFilePath, toFileDefinition);

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Pattern, 'to');
      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Component, 'file');
      expect(result).toMatchSnapshot();
    });

    it('should build the appropriate schema for kamelets', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');
      const toFilePath = 'from.steps.0.to';
      const toFileDefinition = {
        id: 'to-3044',
        uri: 'kamelet:kafka-not-secured-sink',
      };

      const result = CamelComponentSchemaService.getVisualComponentSchema(toFilePath, toFileDefinition);

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Pattern, 'to');
      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Kamelet, 'kafka-not-secured-sink');
      expect(result).toMatchSnapshot();
    });

    it('should transform a string-based `To` processor', () => {
      const toBeanPath = 'from.steps.0.to';
      const toBeanDefinition = {
        uri: 'bean',
        parameters: {
          beanName: 'myBean',
          method: 'hello',
        },
      };

      const result = CamelComponentSchemaService.getVisualComponentSchema(toBeanPath, toBeanDefinition);

      expect(result).toMatchSnapshot();
    });

    it('should transform a string-based `ToD` processor', () => {
      const toDBeanPath = 'from.steps.0.toD';
      const toDBeanDefinition = {
        uri: 'bean',
        parameters: {
          beanName: 'myBean',
          method: 'hello',
        },
      };

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
        uri: 'timer',
        parameters: {
          timerName: 'timer-1',
          delay: 5,
          period: 5000,
          synchronous: true,
        },
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
      ['route', { from: { uri: 'timer' } }, { processorName: 'route' }],
      ['intercept', { id: 'intercept-8888', steps: [] }, { processorName: 'intercept' }],
      ['from', { uri: 'timer' }, { processorName: 'from', componentName: 'timer' }],
      ['from.steps.0.to', { uri: 'log' }, { processorName: 'to', componentName: 'log' }],
      ['from.steps.1.toD', { uri: 'log' }, { processorName: 'toD', componentName: 'log' }],
      ['from.steps.2.poll', { uri: 'http://localhost:5173' }, { processorName: 'poll', componentName: 'http' }],
      ['from.steps.0.to', 'log', { processorName: 'to', componentName: 'log' }],
      ['from.steps.1.toD', 'log', { processorName: 'toD', componentName: 'log' }],
      ['from.steps.1.poll', 'log', { processorName: 'poll', componentName: 'log' }],
      ['from.steps.2.log', { message: 'Hello World' }, { processorName: 'log' }],
      ['from.steps.3.choice', {}, { processorName: 'choice' }],
      ['from.steps.3.choice.when.0', {}, { processorName: 'when' }],
      ['from.steps.3.choice.otherwise', {}, { processorName: 'otherwise' }],
      ['from.steps.3.choice.otherwise', undefined, { processorName: 'otherwise' }],
      ['from.steps.0.step', undefined, { processorName: 'step' }],
      ['from.steps.0.step', { id: 'step-1234' }, { processorName: 'step' }],
      ['from.steps.0.step', { id: `${DATAMAPPER_ID_PREFIX}-1234`, steps: [] }, { processorName: 'step' }],
      [
        'from.steps.0.step',
        { id: `modified-${DATAMAPPER_ID_PREFIX}-1234`, steps: [{ to: { uri: `${XSLT_COMPONENT_NAME}:mapping.xsl` } }] },
        { processorName: 'step' },
      ],
      [
        'from.steps.0.step',
        { id: `${DATAMAPPER_ID_PREFIX}-1234`, steps: [{ to: { uri: `${XSLT_COMPONENT_NAME}:mapping.xsl` } }] },
        { processorName: DATAMAPPER_ID_PREFIX },
      ],
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
        { processorName: 'route' },
        { id: 'route-1234', description: 'My Route description', from: { uri: 'timer' } },
        'My Route description',
      ],
      [
        { processorName: 'route' },
        { id: 'route-1234', from: { uri: 'timer', parameters: { timerName: 'foo' }, description: '' } },
        'route-1234',
      ],
      [{ processorName: 'from' }, { uri: 'timer', parameters: { timerName: 'foo' }, description: '' }, 'timer'],
      [
        { processorName: 'from' },
        { uri: 'timer', parameters: { timerName: 'foo' }, description: 'this is a description' },
        'this is a description',
      ],
      [
        { processorName: 'from' },
        { uri: 'timer', parameters: { timerName: 'foo', delay: 1000, period: 1000 } },
        'timer',
      ],
      [{ processorName: 'from' }, {}, 'from: Unknown'],
      [{ processorName: 'from', id: 'from-1234', uri: '' }, {}, 'from: Unknown'],
      [{ processorName: 'from', uri: '' }, {}, 'from: Unknown'],
      [{ processorName: 'from', uri: null }, {}, 'from: Unknown'],
      [{ processorName: 'from', uri: 10 }, {}, 'from: Unknown'],
      [{ processorName: 'from', uri: undefined }, {}, 'from: Unknown'],
      [{ processorName: 'to' }, { uri: 'timer', parameters: { timerName: 'foo' } }, 'timer'],
      [{ processorName: 'to' }, {}, 'to'],
      [{ processorName: 'to' }, undefined, 'to'],
      [{ processorName: 'to' }, null, 'to'],
      [{ processorName: 'to' }, '', 'to'],
      [
        { processorName: 'to', componentName: 'direct' },
        { uri: 'direct', parameters: { name: 'anotherWorld' } },
        'anotherWorld',
      ],
      [{ processorName: 'toD' }, { uri: 'timer', parameters: { timerName: 'foo' } }, 'timer'],
      [{ processorName: 'toD' }, {}, 'toD'],
      [{ processorName: 'toD' }, undefined, 'toD'],
      [{ processorName: 'toD' }, null, 'toD'],
      [{ processorName: 'toD' }, '', 'toD'],
      [
        { processorName: 'toD', componentName: 'direct' },
        { uri: 'direct', parameters: { name: 'anotherWorld' } },
        'anotherWorld',
      ],
      [{ processorName: 'poll' }, { uri: 'timer', parameters: { timerName: 'foo' } }, 'timer'],
      [{ processorName: 'poll' }, {}, 'poll'],
      [{ processorName: 'poll' }, undefined, 'poll'],
      [{ processorName: 'poll' }, null, 'poll'],
      [{ processorName: 'poll' }, '', 'poll'],
      [
        { processorName: 'poll', componentName: 'direct' },
        { uri: 'direct', parameters: { name: 'anotherWorld' } },
        'anotherWorld',
      ],
      [{ processorName: 'choice' }, {}, 'choice'],
      [{ processorName: 'otherwise' }, {}, 'otherwise'],
      [{ processorName: 'errorHandler' }, { id: 'errorHandler-1234', description: 'Error Handler' }, 'Error Handler'],
      [{ processorName: 'errorHandler' }, { id: 'errorHandler-1234' }, 'errorHandler-1234'],
      [{ processorName: 'onException' }, { id: 'onException-1234', description: 'On Exception' }, 'On Exception'],
      [{ processorName: 'onException' }, { id: 'onException-1234' }, 'onException-1234'],
      [{ processorName: 'onCompletion' }, { id: 'onCompletion-1234', description: 'On Completion' }, 'On Completion'],
      [{ processorName: 'onCompletion' }, { id: 'onCompletion-1234' }, 'onCompletion-1234'],
      [{ processorName: 'intercept' }, { id: 'intercept-1234', description: 'Intercept' }, 'Intercept'],
      [{ processorName: 'intercept' }, { id: 'intercept-1234' }, 'intercept-1234'],
      [{ processorName: 'interceptFrom' }, { id: 'interceptFrom-1234', description: 'InterceptFrom' }, 'InterceptFrom'],
      [{ processorName: 'interceptFrom' }, { id: 'interceptFrom-1234' }, 'interceptFrom-1234'],
      [
        { processorName: 'interceptSendToEndpoint' },
        { id: 'interceptSendToEndpoint-1234', description: 'InterceptSendToEndpoint' },
        'InterceptSendToEndpoint',
      ],
      [
        { processorName: 'interceptSendToEndpoint' },
        { id: 'interceptSendToEndpoint-1234' },
        'interceptSendToEndpoint-1234',
      ],
      [{ processorName: 'step' }, { id: 'kaoto-datamapper-1234' }, 'kaoto-datamapper-1234'],
      [{ processorName: 'step' }, { id: 'step-1234' }, 'step-1234'],
    ] as Array<[ICamelElementLookupResult, unknown, string]>)(
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

  describe('getNodeTitle', () => {
    const specs: [ICamelElementLookupResult, string][] = [
      [{ processorName: 'route' } as unknown as ICamelElementLookupResult, 'Route'],
      [{ processorName: 'from' } as unknown as ICamelElementLookupResult, 'From'],
      [{ processorName: 'tokenizer' }, 'Specialized tokenizer for AI applications'],
      [{ processorName: 'to', componentName: 'timer' }, 'Timer'],
      [{ processorName: 'to', componentName: 'kamelet:chuck-norris-source' }, 'Chuck Norris Source'],
      [{ processorName: 'to', componentName: 'kamelet:chuck-norris' }, 'Kamelet'],
    ];

    it.each(specs)(`should return the %s title`, (camelElementLookup, expected) => {
      const result = CamelComponentSchemaService.getNodeTitle(camelElementLookup);

      expect(result).toEqual(expected);
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

      expect(actualContent).toContain('Deserialize payload to Avro');
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

    it('should return the component name from the uri', () => {
      const uri = 'timer';
      const componentName = CamelComponentSchemaService.getComponentNameFromUri(uri);
      expect(componentName).toEqual('timer');
    });
  });

  describe('getNodeDefinitionValue', () => {
    it('should return Node definition for a simple processor', () => {
      const clipboadContent: IClipboardCopyObject = {
        type: SourceSchemaType.Route,
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
      const clipboadContent: IClipboardCopyObject = {
        type: SourceSchemaType.Route,
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

  describe('getComponentDefinitionFromUri', () => {
    it('returns undefined for empty uri', () => {
      expect(CamelComponentSchemaService.getComponentDefinitionFromUri('')).toEqual({ uri: '' });
    });

    it('returns undefined for unknown component', () => {
      jest.spyOn(CamelCatalogService, 'getComponent').mockReturnValueOnce(undefined);
      expect(CamelComponentSchemaService.getComponentDefinitionFromUri('unknown:foo')).toEqual({ uri: 'unknown:foo' });
    });

    it('parses simple component uri', () => {
      jest.spyOn(CamelCatalogService, 'getComponent').mockReturnValueOnce({
        component: { syntax: 'timer:timerName' },
        propertiesSchema: { required: ['timerName'] },
      } as ICamelComponentDefinition);
      expect(CamelComponentSchemaService.getComponentDefinitionFromUri('timer:myTimer')).toEqual({
        uri: 'timer',
        parameters: { timerName: 'myTimer' },
      });
    });

    it('parses uri with query parameters', () => {
      jest.spyOn(CamelCatalogService, 'getComponent').mockReturnValueOnce({
        component: { syntax: 'timer:timerName' },
        propertiesSchema: {
          required: ['timerName'],
        },
      } as ICamelComponentDefinition);
      expect(CamelComponentSchemaService.getComponentDefinitionFromUri('timer:myTimer?period=1000&delay=500')).toEqual({
        uri: 'timer',
        parameters: { timerName: 'myTimer', period: 1000, delay: 500 },
      });
    });

    it('parses kamelet uri', () => {
      jest.spyOn(CamelCatalogService, 'getComponent').mockReturnValueOnce(undefined);
      expect(CamelComponentSchemaService.getComponentDefinitionFromUri('kamelet:beer-source')).toEqual({
        uri: 'kamelet:beer-source',
      });
    });
  });
});
