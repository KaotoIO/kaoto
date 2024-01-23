import * as catalogIndex from '@kaoto-next/camel-catalog/index.json';
import cloneDeep from 'lodash.clonedeep';
import { camelRouteJson } from '../../../stubs/camel-route';
import { CamelRouteVisualEntity } from './camel-route-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { CatalogKind } from '../../catalog-kind';
import { ICamelComponentDefinition } from '../../camel-components-catalog';
import { ICamelProcessorDefinition } from '../..';

describe('AbstractCamelVisualEntity', () => {
  let abstractVisualEntity: CamelRouteVisualEntity;

  beforeAll(async () => {
    const componentCatalogMap: Record<string, ICamelComponentDefinition> = await import(
      '@kaoto-next/camel-catalog/' + catalogIndex.catalogs.components.file
    );
    const modelsCatalogMap: Record<string, ICamelProcessorDefinition> = await import(
      '@kaoto-next/camel-catalog/' + catalogIndex.catalogs.models.file
    );
    CamelCatalogService.setCatalogKey(CatalogKind.Component, componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, modelsCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, modelsCatalogMap);
  });
  afterAll(() => {
    CamelCatalogService.clearCatalogs();
  });

  beforeEach(() => {
    abstractVisualEntity = new CamelRouteVisualEntity(cloneDeep(camelRouteJson.route));
  });

  describe('getNodeValidationText', () => {
    it('should return an `undefined` if the path is `undefined`', () => {
      const result = abstractVisualEntity.getNodeValidationText(undefined);

      expect(result).toEqual(undefined);
    });

    it('should return an `undefined` if the path is empty', () => {
      const result = abstractVisualEntity.getNodeValidationText('');

      expect(result).toEqual(undefined);
    });

    it('should return a validation text relying on the `validateNodeStatus` method', () => {
      const missingParametersModel = cloneDeep(camelRouteJson.route);
      missingParametersModel.from.uri = '';
      abstractVisualEntity = new CamelRouteVisualEntity(missingParametersModel);

      const result = abstractVisualEntity.getNodeValidationText('from');

      expect(result).toEqual('1 required parameter is not yet configured: [ uri ]');
    });
  });
});
