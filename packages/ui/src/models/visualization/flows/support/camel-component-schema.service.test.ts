import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { DATAMAPPER_ID_PREFIX, XSLT_COMPONENT_NAME } from '../../../../utils';
import { SourceSchemaType } from '../../../camel/source-schema-type';
import { ICamelComponentDefinition } from '../../../camel-components-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { NodeLabelType } from '../../../settings/settings.model';
import { IClipboardCopyObject } from '../../clipboard';
import { CamelCatalogService } from '../camel-catalog.service';
import { CamelComponentSchemaService } from './camel-component-schema.service';
import { CamelProcessorStepsProperties, ICamelElementLookupResult } from './camel-component-types';

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
    jest.clearAllMocks();
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
  });

  describe('getSchema', () => {
    it.each([
      ['route', CatalogKind.Entity],
      ['intercept', CatalogKind.Entity],
      ['interceptFrom', CatalogKind.Entity],
      ['interceptSendToEndpoint', CatalogKind.Entity],
      ['onException', CatalogKind.Entity],
      ['onCompletion', CatalogKind.Entity],
      ['from', CatalogKind.Entity],
      ['aggregate', CatalogKind.Pattern],
      ['choice', CatalogKind.Pattern],
      ['to', CatalogKind.Pattern],
    ])('should leverage the CamelComponentSchemaService.getComponent method', (processorName, catalogKind) => {
      const getComponentSpy = jest.spyOn(CamelCatalogService, 'getComponent');

      CamelComponentSchemaService.getSchema({ processorName: processorName as keyof ProcessorDefinition });

      expect(getComponentSpy).toHaveBeenCalledWith(catalogKind, processorName);
    });

    it.each([undefined, { propertiesSchema: undefined }])(
      'should return an empty schema when the processor it is not found',
      (schema) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(CamelCatalogService, 'getComponent').mockReturnValueOnce(schema as any);
        const result = CamelComponentSchemaService.getSchema({
          processorName: 'non-existing-processor' as keyof ProcessorDefinition,
        });

        expect(result).toEqual({});
      },
    );

    it('should clone the component processor schema to avoid mutating the original one', () => {
      const originalSchema = CamelCatalogService.getComponent(CatalogKind.Pattern, 'aggregate')?.propertiesSchema;

      const result = CamelComponentSchemaService.getSchema({ processorName: 'aggregate' });

      expect(result).not.toBe(originalSchema);
      expect(result).toEqual(originalSchema);
    });

    it('should build the appropriate schema for entities', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');
      const result = CamelComponentSchemaService.getSchema({ processorName: 'from' as keyof ProcessorDefinition });

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Entity, 'from');
      expect(result).toMatchSnapshot();
    });

    it('should build the appropriate schema for standalone processors', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');
      const result = CamelComponentSchemaService.getSchema({ processorName: 'log' });

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Pattern, 'log');
      expect(result).toMatchSnapshot();
    });

    it('should build the appropriate schema for processors combined that holds a component', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');
      const result = CamelComponentSchemaService.getSchema({ processorName: 'to', componentName: 'log' });

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Pattern, 'to');
      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Component, 'log');
      expect(result).toMatchSnapshot();
    });

    it('should build the appropriate schema for producer/consumer components', () => {
      const consumerComponent = CamelComponentSchemaService.getSchema({
        processorName: 'from' as keyof ProcessorDefinition,
        componentName: 'file',
      });
      const producerComponent = CamelComponentSchemaService.getSchema({
        processorName: 'to',
        componentName: 'file',
      });
      const consumerProperties = Object.keys(consumerComponent.properties?.parameters.properties ?? {});
      const producerProperties = Object.keys(producerComponent.properties?.parameters.properties ?? {});

      expect(consumerProperties).not.toEqual(producerProperties);
      expect(consumerProperties).toContain('bridgeErrorHandler');
      expect(producerProperties).not.toContain('bridgeErrorHandler');
      expect(producerProperties).toContain('allowNullBody');
      expect(consumerProperties).not.toContain('allowNullBody');
      expect(consumerProperties).toMatchSnapshot();
      expect(producerProperties).toMatchSnapshot();
    });

    it('should build the appropriate schema for kamelets', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');

      const result = CamelComponentSchemaService.getSchema({
        processorName: 'to',
        componentName: 'kamelet:kafka-not-secured-sink',
      });

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Pattern, 'to');
      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Kamelet, 'kafka-not-secured-sink');
      expect(result).toMatchSnapshot();
    });
  });

  describe('getUpdatedDefinition', () => {
    const textBasedProcessors: [ICamelElementLookupResult, string, object][] = [
      [
        {
          processorName: 'to',
          componentName: 'bean',
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
          processorName: 'toD',
          componentName: 'bean',
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
          processorName: 'log',
        },
        '${body}',
        {
          message: '${body}',
        },
      ],
    ];

    it.each(textBasedProcessors)(
      'should transform string-based processors',
      (componentLookup, definition, expectedResult) => {
        const result = CamelComponentSchemaService.getUpdatedDefinition(componentLookup, definition);

        expect(result).toMatchObject(expectedResult);
      },
    );

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
        { processorName: 'to', componentName: 'log' },
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
        { processorName: 'from' as keyof ProcessorDefinition, componentName: 'timer' },
        toLogDefinition,
      );

      expect(result.uri).toEqual('timer');
      expect(result.parameters).toEqual({});
    });

    it('should not build a schema for an unknown component', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');
      const toNonExistingDefinition = {
        id: 'to-3044',
        uri: 'non-existing-component',
        parameters: {
          level: 'ERROR',
        },
      };

      const result = CamelComponentSchemaService.getUpdatedDefinition(
        { processorName: 'to', componentName: 'non-existing-component' },
        toNonExistingDefinition,
      );

      expect(camelCatalogServiceSpy).toHaveBeenCalledTimes(2);
      expect(camelCatalogServiceSpy).toHaveBeenNthCalledWith(1, CatalogKind.Component, 'non-existing-component');
      expect(camelCatalogServiceSpy).toHaveBeenNthCalledWith(2, CatalogKind.Component, 'non-existing-component');
      expect(result).toEqual({
        id: 'to-3044',
        parameters: {
          level: 'ERROR',
        },
        uri: 'non-existing-component',
      });
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

  describe('flattenMultivalueParameters', () => {
    it('should return an empty object when parameters is undefined', () => {
      const result = CamelComponentSchemaService.flattenMultivalueParameters('quartz', undefined);
      expect(result).toEqual({});
    });

    it('should return parameters unchanged when component has no multivalue properties', () => {
      const parameters = { message: 'Hello World', level: 'INFO' };
      const result = CamelComponentSchemaService.flattenMultivalueParameters('log', parameters);
      expect(result).toEqual(parameters);
    });

    it('should flatten nested multivalue parameters', () => {
      const parameters = { jobParameters: { test: 'test' }, triggerParameters: { test: 'test' } };
      const result = CamelComponentSchemaService.flattenMultivalueParameters('quartz', parameters);
      expect(result).toEqual({ 'job.test': 'test', 'trigger.test': 'test' });
    });

    it('should preserve non-multivalue parameters alongside flattened ones', () => {
      const parameters = { cron: '0/1 * * * * ?', jobParameters: { retries: '3' } };
      const result = CamelComponentSchemaService.flattenMultivalueParameters('quartz', parameters);
      expect(result).toEqual({ cron: '0/1 * * * * ?', 'job.retries': '3' });
    });
  });

  describe('nestMultivalueParameters', () => {
    it('should return an empty object when flatParameters is undefined', () => {
      const result = CamelComponentSchemaService.nestMultivalueParameters('quartz', undefined);
      expect(result).toEqual({});
    });

    it('should return parameters unchanged when component has no multivalue properties', () => {
      const flatParameters = { message: 'Hello World', level: 'INFO' };
      const result = CamelComponentSchemaService.nestMultivalueParameters('log', flatParameters);
      expect(result).toEqual(flatParameters);
    });

    it('should nest flat multivalue parameters', () => {
      const flatParameters = { 'job.test': 'test', 'trigger.test': 'test' };
      const result = CamelComponentSchemaService.nestMultivalueParameters('quartz', flatParameters);
      expect(result).toEqual({ jobParameters: { test: 'test' }, triggerParameters: { test: 'test' } });
    });

    it('should preserve non-multivalue parameters alongside nested ones', () => {
      const flatParameters = { cron: '0/1 * * * * ?', 'job.retries': '3' };
      const result = CamelComponentSchemaService.nestMultivalueParameters('quartz', flatParameters);
      expect(result).toEqual({ cron: '0/1 * * * * ?', jobParameters: { retries: '3' }, triggerParameters: {} });
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
