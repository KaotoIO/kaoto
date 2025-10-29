import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { cloneDeep } from 'lodash';
import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { CamelCatalogService } from '../camel-catalog.service';
import { KameletSchemaService } from './kamelet-schema.service';

describe('KameletSchemaService', () => {
  let kameletCatalogMap: Record<string, unknown>;

  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    kameletCatalogMap = catalogsMap.kameletsCatalogMap;

    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      'log-action': (kameletCatalogMap as any)['log-action'],
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      'xj-template-action': (kameletCatalogMap as any)['xj-template-action'],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    CamelCatalogService.clearCatalogs();
  });

  describe('getVisualComponentSchema', () => {
    it('should return undefined when step is undefined', () => {
      expect(KameletSchemaService.getVisualComponentSchema(undefined)).toBeUndefined();
    });

    it('should build the appropriate schema for kamelets', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');

      const result = KameletSchemaService.getVisualComponentSchema({
        ref: {
          kind: 'Kamelet',
          apiVersion: 'camel.apache.org/v1',
          name: 'log-action',
        },
      });

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Kamelet, 'log-action');
      expect(result).toMatchSnapshot();
    });

    it('should build the appropriate schema for kamelets with required properties', () => {
      const camelCatalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');

      const result = KameletSchemaService.getVisualComponentSchema({
        ref: {
          kind: 'Kamelet',
          apiVersion: 'camel.apache.org/v1',
          name: 'xj-template-action',
        },
      });

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Kamelet, 'xj-template-action');
      expect(result).toMatchSnapshot();
    });

    it('should provide a default empty string if the kamelet name is not found', () => {
      const namelessKamelet = cloneDeep((kameletCatalogMap as any)['log-action']);
      namelessKamelet.metadata.name = undefined as unknown as string;
      jest.spyOn(CamelCatalogService, 'getComponent').mockReturnValueOnce(namelessKamelet);

      const result = KameletSchemaService.getVisualComponentSchema({
        ref: {
          kind: 'Kamelet',
          apiVersion: 'camel.apache.org/v1',
          name: 'log-action',
        },
      });

      expect(result).toMatchSnapshot();
    });

    it('should retrieve the properties from the step', () => {
      const result = KameletSchemaService.getVisualComponentSchema({
        ref: {
          kind: 'Kamelet',
          apiVersion: 'camel.apache.org/v1',
          name: 'beer-source',
        },
        properties: {
          foo: 'bar',
        },
      });

      expect(result?.definition).toMatchSnapshot();
    });
  });

  describe('getNodeLabel', () => {
    it.each([
      ['source', 'source', undefined],
      ['sink', 'sink', undefined],
      ['', 'steps.0', undefined],
      [
        'beer-source',
        'source',
        {
          ref: {
            kind: 'Kamelet',
            apiVersion: 'camel.apache.org/v1',
            name: 'beer-source',
          },
        },
      ],
    ])('should return the %s for the %s label', (expected, path, step) => {
      const result = KameletSchemaService.getNodeLabel(step, path);

      expect(result).toEqual(expected);
    });
  });

  describe('getTooltipContent', () => {
    it('should return the Kamelet description as the tooltip content', () => {
      const step = {
        ref: {
          kind: 'Kamelet',
          apiVersion: 'camel.apache.org/v1',
          name: 'log-action',
        },
      };
      const result = KameletSchemaService.getTooltipContent(step, 'steps.0');

      expect(result).toEqual('Logs all data that flows between source and sink, useful for debugging purposes.');
    });

    it('should return the Kamelet name as the tooltip content', () => {
      const step = {
        ref: {
          kind: 'Kamelet',
          apiVersion: 'camel.apache.org/v1',
          name: 'xyz-source',
        },
      };
      const result = KameletSchemaService.getTooltipContent(step, 'source');

      expect(result).toEqual('xyz-source');
    });

    it('should return the Kamelet path as the tooltip content', () => {
      const result = KameletSchemaService.getTooltipContent(undefined, 'sink');

      expect(result).toEqual('sink: Unknown');
    });
  });
});
