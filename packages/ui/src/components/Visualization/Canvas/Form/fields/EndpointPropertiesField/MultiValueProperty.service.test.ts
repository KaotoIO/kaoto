import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../../../../../models';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../../../../stubs/test-load-catalog';
import { MultiValuePropertyService } from './MultiValueProperty.service';

describe('MultiValuePropertyService', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    setupDynamicCatalogRegistry(catalogsMap);
  });

  afterAll(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  describe('getMultiValueProperties', () => {
    it('should query the dynamic catalog service', async () => {
      const dynamicCatalogServiceSpy = vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity');

      await MultiValuePropertyService.getMultiValueProperties(CatalogKind.Component, 'log');

      expect(dynamicCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Component, 'log');
    });

    it('should return an empty map for components without multi-value parameters', async () => {
      const result = await MultiValuePropertyService.getMultiValueProperties(CatalogKind.Component, 'log');

      expect(result.size).toBe(0);
    });

    it('should return multi-value prefixes for quartz', async () => {
      const result = await MultiValuePropertyService.getMultiValueProperties(CatalogKind.Component, 'quartz');

      expect(result.get('jobParameters')).toBe('job.');
      expect(result.get('triggerParameters')).toBe('trigger.');
    });
  });

  describe('readMultiValue', () => {
    it('should return original properties if component has no multi-value parameters', async () => {
      const multiValueMap = await MultiValuePropertyService.getMultiValueProperties(CatalogKind.Component, 'log');
      const definition = { message: 'Hello World', level: 'INFO' };
      const result = MultiValuePropertyService.readMultiValue(multiValueMap, definition);

      expect(result).toEqual({ message: 'Hello World', level: 'INFO' });
    });

    it('should return original properties if component is not found', async () => {
      const multiValueMap = await MultiValuePropertyService.getMultiValueProperties(
        CatalogKind.Component,
        'unknown-component',
      );
      const definition = { param1: 'value1', param2: 'value2' };
      const result = MultiValuePropertyService.readMultiValue(multiValueMap, definition);

      expect(result).toEqual({ param1: 'value1', param2: 'value2' });
    });

    it('should convert flat multi-value parameters to nested structure', async () => {
      const multiValueMap = await MultiValuePropertyService.getMultiValueProperties(CatalogKind.Component, 'quartz');
      const definition = {
        'job.name': 'myJob',
        'job.description': 'My job description',
        'trigger.repeatCount': '5',
        'trigger.repeatInterval': '1000',
        normalParam: 'normalValue',
      };
      const result = MultiValuePropertyService.readMultiValue(multiValueMap, definition);

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

    it('should handle mixed parameters correctly', async () => {
      const multiValueMap = await MultiValuePropertyService.getMultiValueProperties(CatalogKind.Component, 'quartz');
      const definition = {
        'job.name': 'testJob',
        regularParam: 'value',
        'trigger.cron': '0 0 * * *',
      };
      const result = MultiValuePropertyService.readMultiValue(multiValueMap, definition);

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

    it('should handle empty definition', async () => {
      const multiValueMap = await MultiValuePropertyService.getMultiValueProperties(CatalogKind.Component, 'quartz');
      const definition = {};
      const result = MultiValuePropertyService.readMultiValue(multiValueMap, definition);

      expect(result).toEqual({
        jobParameters: {},
        triggerParameters: {},
      });
    });
  });

  describe('getMultiValueSerializedDefinition', () => {
    it('should return the definition with empty parameters when multi-value map is empty', () => {
      const definition = { log: { message: 'Hello World' } };
      const result = MultiValuePropertyService.getMultiValueSerializedDefinition(new Map(), definition);

      expect(result).toEqual({ log: { message: 'Hello World' }, parameters: {} });
    });

    it('should return the same parameters if the component is not found', () => {
      const definition = {
        uri: 'unknown-component',
        parameters: { jobParameters: { test: 'test' }, triggerParameters: { test: 'test' } },
      };
      const result = MultiValuePropertyService.getMultiValueSerializedDefinition(new Map(), definition);

      expect(result).toEqual(definition);
    });

    it('should return the serialized definition', async () => {
      const multiValueMap = await MultiValuePropertyService.getMultiValueProperties(CatalogKind.Component, 'quartz');
      const definition = {
        uri: 'quartz',
        parameters: { jobParameters: { test: 'test' }, triggerParameters: { test: 'test' } },
      };
      const result = MultiValuePropertyService.getMultiValueSerializedDefinition(multiValueMap, definition);

      expect(result).toEqual({
        uri: 'quartz',
        parameters: { 'job.test': 'test', 'trigger.test': 'test' },
      });
    });

    it('should omit nested child entries whose value is undefined', async () => {
      const multiValueMap = await MultiValuePropertyService.getMultiValueProperties(CatalogKind.Component, 'quartz');
      const definition = {
        uri: 'quartz',
        parameters: {
          jobParameters: { name: 'myJob', description: undefined },
          triggerParameters: { cron: '0 0 * * *' },
        },
      };
      const result = MultiValuePropertyService.getMultiValueSerializedDefinition(multiValueMap, definition);

      // 'job.description' must NOT appear in the output — its value is undefined
      expect(result).toEqual({
        uri: 'quartz',
        parameters: { 'job.name': 'myJob', 'trigger.cron': '0 0 * * *' },
      });
      expect(result!.parameters).not.toHaveProperty('job.description');
    });

    it('should not emit any flat key when the entire nested object has only undefined values (delete/clear flow)', async () => {
      const multiValueMap = await MultiValuePropertyService.getMultiValueProperties(CatalogKind.Component, 'quartz');
      const definition = {
        uri: 'quartz',
        parameters: {
          jobParameters: { name: undefined },
        },
      };
      const result = MultiValuePropertyService.getMultiValueSerializedDefinition(multiValueMap, definition);

      // The key must be entirely absent — not present with value undefined
      expect(Object.prototype.hasOwnProperty.call(result!.parameters, 'job.name')).toBe(false);
    });
  });
});
