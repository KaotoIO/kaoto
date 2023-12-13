import cloneDeep from 'lodash/cloneDeep';
import { CatalogKind } from '../../..';
import { CamelCatalogService } from '../camel-catalog.service';
import { KameletSchemaService } from './kamelet-schema.service';
import * as kameletCatalogMap from '@kaoto-next/camel-catalog/kamelets-aggregate.json';

describe('KameletSchemaService', () => {
  beforeEach(() => {
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
