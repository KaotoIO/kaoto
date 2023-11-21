import { ProcessorDefinition } from '@kaoto-next/camel-catalog/types';
import { CatalogKind } from '../../..';
import { beerSourceKamelet } from '../../../../stubs/beer-source-kamelet';
import { logComponent } from '../../../../stubs/log-component';
import { logModel } from '../../../../stubs/log-model';
import { timerComponent } from '../../../../stubs/timer-component';
import { toModel } from '../../../../stubs/to-model';
import { ICamelProcessorProperty } from '../../../camel-processors-catalog';
import { CamelCatalogService } from '../camel-catalog.service';
import { CamelComponentSchemaService } from './camel-component-schema.service';

describe('CamelComponentSchemaService', () => {
  beforeEach(() => {
    CamelCatalogService.setCatalogKey(CatalogKind.Component, {
      log: logComponent,
      timer: timerComponent,
    });
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, {
      log: logModel,
      to: toModel,
    });
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, {
      'beer-source': beerSourceKamelet,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    CamelCatalogService.clearCatalogs();
  });

  describe('getVisualComponentSchema', () => {
    const path = 'from';
    const definition = { uri: 'timer:foo?delay=1000&period=1000' };

    it('should leverage the getCamelComponentLookup method', () => {
      const getCamelComponentLookupSpy = jest.spyOn(CamelComponentSchemaService, 'getCamelComponentLookup');
      CamelComponentSchemaService.getVisualComponentSchema(path, definition);

      expect(getCamelComponentLookupSpy).toHaveBeenCalledWith(path, definition);
    });

    it('should return an empty schema when the processor it is not found', () => {
      jest.spyOn(CamelComponentSchemaService, 'getCamelComponentLookup');
      const result = CamelComponentSchemaService.getVisualComponentSchema(path, definition);

      expect(result).toEqual({
        title: 'from',
        schema: {},
        definition,
      });
    });

    it('should build the appropriate schema for standalone processors', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');
      const logPath = 'from.steps.0.log';
      const logDefinition = { message: 'Hello World' };

      const result = CamelComponentSchemaService.getVisualComponentSchema(logPath, logDefinition);

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Processor, 'log');
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

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Processor, 'to');
      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Component, 'log');
      expect(result).toMatchSnapshot();
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

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Processor, 'to');
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
    ])('should return the processor and component name for %s', (path, definition, result) => {
      const camelElementLookup = CamelComponentSchemaService.getCamelComponentLookup(path, definition);

      expect(camelElementLookup).toEqual(result);
    });
  });

  describe('getLabel', () => {
    it('should return the component name if provided', () => {
      const label = CamelComponentSchemaService.getLabel(
        { processorName: 'from' as keyof ProcessorDefinition, componentName: 'timer' },
        {},
      );

      expect(label).toEqual('timer');
    });

    it.each([
      [
        { processorName: 'from' as keyof ProcessorDefinition },
        { uri: 'timer:foo?delay=1000&period=1000' },
        'timer:foo?delay=1000&period=1000',
      ],
      [{ processorName: 'from' as keyof ProcessorDefinition }, {}, ''],
      [{ processorName: 'to' as keyof ProcessorDefinition }, 'timer:foo', 'timer:foo'],
      [{ processorName: 'toD' as keyof ProcessorDefinition }, 'log', 'log'],
      [{ processorName: 'to' as keyof ProcessorDefinition }, { uri: 'timer:foo' }, 'timer:foo'],
      [{ processorName: 'toD' as keyof ProcessorDefinition }, { uri: 'log' }, 'log'],
      [{ processorName: 'to' as keyof ProcessorDefinition }, {}, 'to'],
      [{ processorName: 'toD' as keyof ProcessorDefinition }, {}, 'toD'],
      [{ processorName: 'choice' as keyof ProcessorDefinition }, {}, 'choice'],
      [{ processorName: 'otherwise' as keyof ProcessorDefinition }, {}, 'otherwise'],
    ])(
      'should return the processor name if the component name is not provided: %s',
      (componentLookup, definition, result) => {
        const label = CamelComponentSchemaService.getLabel(componentLookup, definition);

        expect(label).toEqual(result);
      },
    );
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

    it('should return an empty string if not found', () => {
      const iconName = CamelComponentSchemaService.getIconName({
        processorName: 'from' as keyof ProcessorDefinition,
      });

      expect(iconName).toEqual('');
    });
  });

  describe('getJSONType', () => {
    it('should return the JSON type for enums', () => {
      const enumProperty: ICamelProcessorProperty = {
        index: 1,
        kind: 'attribute',
        displayName: 'Library',
        required: false,
        type: 'enum',
        javaType: 'org.apache.camel.model.dataformat.AvroLibrary',
        enum: ['ApacheAvro', 'Jackson'],
        deprecated: false,
        autowired: false,
        secret: false,
        defaultValue: 'ApacheAvro',
        description: 'Which Avro library to use.',
      };

      const jsonType = CamelComponentSchemaService.getJSONType(enumProperty);
      expect(jsonType).toEqual(undefined);
    });

    it('should return the JSON type for a duration field', () => {
      const durationProperty: ICamelProcessorProperty = {
        index: 1,
        kind: 'attribute',
        displayName: 'Batch Timeout',
        required: false,
        type: 'duration',
        javaType: 'java.lang.String',
        deprecated: false,
        autowired: false,
        secret: false,
        defaultValue: '1000',
        description: 'Sets the timeout for collecting elements to be re-ordered. The default timeout is 1000 msec.',
      };
      const jsonType = CamelComponentSchemaService.getJSONType(durationProperty);
      expect(jsonType).toEqual('string');
    });

    it('should return the JSON type for a duration field', () => {
      const objectProperty: ICamelProcessorProperty = {
        index: 0,
        kind: 'expression',
        displayName: 'Correlation Expression',
        required: true,
        type: 'object',
        javaType: 'org.apache.camel.model.ExpressionSubElementDefinition',
        oneOf: ['python', 'xpath'],
        deprecated: false,
        autowired: false,
        secret: false,
        description: 'The expression used to calculate the correlation key to use for aggregation.',
      };
      const jsonType = CamelComponentSchemaService.getJSONType(objectProperty);
      expect(jsonType).toEqual('object');
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

    it('should return the component name from the uri', () => {
      const uri = 'timer:foo?delay=1000&period=1000';
      const componentName = CamelComponentSchemaService.getComponentNameFromUri(uri);
      expect(componentName).toEqual('timer');
    });
  });

  describe('getSchemaFromCamelCommonProperties', () => {
    it('should return an empty schema if the properties are empty', () => {
      const schema = CamelComponentSchemaService.getSchemaFromCamelCommonProperties({});
      expect(schema).toEqual({ properties: {}, required: [], type: 'object' });
    });

    it('should return a schema with the properties', () => {
      const schema = CamelComponentSchemaService.getSchemaFromCamelCommonProperties(logModel.properties);

      expect(schema).toMatchSnapshot();
    });
  });
});
