import cloneDeep from 'lodash/cloneDeep';
import { CatalogKind } from '../../..';
import { beerSourceKamelet } from '../../../../stubs/beer-source-kamelet';
import { xjTemplateAction } from '../../../../stubs/xj-template-action.kamelet';
import { CamelCatalogService } from '../camel-catalog.service';
import { KameletSchemaService } from './kamelet-schema.service';

describe('KameletSchemaService', () => {
  beforeEach(() => {
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, {
      'beer-source': beerSourceKamelet,
      'xj-template-action': xjTemplateAction,
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
    const namelessKamelet = cloneDeep(beerSourceKamelet);
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
});
