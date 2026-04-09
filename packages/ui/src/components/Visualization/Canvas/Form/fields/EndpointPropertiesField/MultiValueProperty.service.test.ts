import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { CamelCatalogService, CatalogKind } from '../../../../../../models';
import { getFirstCatalogMap } from '../../../../../../stubs/test-load-catalog';
import { MultiValuePropertyService } from './MultiValueProperty.service';

describe('MultiValuePropertyService', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
  });

  describe('readMultiValue', () => {
    it('should return original properties if component has no multi-value parameters', () => {
      const definition = { message: 'Hello World', level: 'INFO' };
      const result = MultiValuePropertyService.readMultiValue('log', definition);

      expect(result).toEqual({ message: 'Hello World', level: 'INFO' });
    });

    it('should return original properties if component is not found', () => {
      const definition = { param1: 'value1', param2: 'value2' };
      const result = MultiValuePropertyService.readMultiValue('unknown-component', definition);

      expect(result).toEqual({ param1: 'value1', param2: 'value2' });
    });

    it('should convert flat multi-value parameters to nested structure', () => {
      const definition = {
        'job.name': 'myJob',
        'job.description': 'My job description',
        'trigger.repeatCount': '5',
        'trigger.repeatInterval': '1000',
        normalParam: 'normalValue',
      };
      const result = MultiValuePropertyService.readMultiValue('quartz', definition);

      expect(result).toEqual({
        normalParam: 'normalValue',
        jobParameters: {
          name: 'myJob',
          description: 'My job description',
        },
        triggerParameters: {
          repeatCount: '5',
          repeatInterval: '1000',
        },
      });
    });

    it('should handle mixed parameters correctly', () => {
      const definition = {
        'job.name': 'testJob',
        regularParam: 'value',
        'trigger.cron': '0 0 * * *',
      };
      const result = MultiValuePropertyService.readMultiValue('quartz', definition);

      expect(result).toEqual({
        regularParam: 'value',
        jobParameters: {
          name: 'testJob',
        },
        triggerParameters: {
          cron: '0 0 * * *',
        },
      });
    });

    it('should handle empty definition', () => {
      const definition = {};
      const result = MultiValuePropertyService.readMultiValue('quartz', definition);

      expect(result).toEqual({
        jobParameters: {},
        triggerParameters: {},
      });
    });
  });

  describe('getMultiValueSerializedDefinition', () => {
    it('should return the same parameters if the definition is not a component', () => {
      const definition = { log: { message: 'Hello World' } };
      const result = MultiValuePropertyService.getMultiValueSerializedDefinition('from', definition);

      expect(result).toEqual({ log: { message: 'Hello World' }, parameters: {} });
    });

    it('should return the same parameters if the component is not found', () => {
      const definition = {
        uri: 'unknown-component',
        parameters: { jobParameters: { test: 'test' }, triggerParameters: { test: 'test' } },
      };
      const result = MultiValuePropertyService.getMultiValueSerializedDefinition('from', definition);

      expect(result).toEqual(definition);
    });

    it('should query the catalog service', () => {
      const definition = { uri: 'log', parameters: { message: 'Hello World' } };
      const catalogServiceSpy = jest.spyOn(CamelCatalogService, 'getCatalogLookup');

      MultiValuePropertyService.getMultiValueSerializedDefinition('log', definition);
      expect(catalogServiceSpy).toHaveBeenCalledWith('log');
    });

    it('should return the serialized definition', () => {
      const definition = {
        uri: 'quartz',
        parameters: { jobParameters: { test: 'test' }, triggerParameters: { test: 'test' } },
      };
      const result = MultiValuePropertyService.getMultiValueSerializedDefinition('quartz', definition);

      expect(result).toEqual({
        uri: 'quartz',
        parameters: { 'job.test': 'test', 'trigger.test': 'test' },
      });
    });
  });
});
