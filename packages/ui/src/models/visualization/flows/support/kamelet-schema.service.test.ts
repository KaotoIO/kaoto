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
      'beer-source': (kameletCatalogMap as any)['beer-source'],
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
          name: 'beer-source',
        },
      });

      expect(camelCatalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Kamelet, 'beer-source');
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
      const namelessKamelet = cloneDeep((kameletCatalogMap as any)['beer-source']);
      namelessKamelet.metadata.name = undefined as unknown as string;
      jest.spyOn(CamelCatalogService, 'getComponent').mockReturnValueOnce(namelessKamelet);

      const result = KameletSchemaService.getVisualComponentSchema({
        ref: {
          kind: 'Kamelet',
          apiVersion: 'camel.apache.org/v1',
          name: 'beer-source',
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
    it('should return the Kamelet name as the node label', () => {
      const result = KameletSchemaService.getNodeLabel(
        {
          ref: {
            kind: 'Kamelet',
            apiVersion: 'camel.apache.org/v1',
            name: 'beer-source',
          },
        },
        'source',
      );

      expect(result).toEqual('beer-source');
    });

    it('should return the Kamelet name as the node label', () => {
      const result = KameletSchemaService.getNodeLabel(undefined, 'sink');

      expect(result).toEqual('sink: Unknown');
    });
  });

  describe('getTooltipContent', () => {
    it('should return the Kamelet description as the tooltip content', () => {
      const step = {
        ref: {
          kind: 'Kamelet',
          apiVersion: 'camel.apache.org/v1',
          name: 'beer-source',
        },
      };
      const result = KameletSchemaService.getTooltipContent(step, 'source');

      expect(result).toEqual('Produces periodic events about beers!');
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
