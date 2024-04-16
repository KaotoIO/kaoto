import * as catalogIndex from '@kaoto-next/camel-catalog/index.json';
import cloneDeep from 'lodash/cloneDeep';
import { camelRouteJson } from '../../../stubs/camel-route';
import { ICamelComponentDefinition } from '../../camel-components-catalog';
import { ICamelProcessorDefinition } from '../../camel-processors-catalog';
import { CatalogKind } from '../../catalog-kind';
import { CamelCatalogService } from './camel-catalog.service';
import { CamelRouteVisualEntity } from './camel-route-visual-entity';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';

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

  describe('getNodeInteraction', () => {
    it('should not allow marked processors to have previous/next steps', () => {
      const result = abstractVisualEntity.getNodeInteraction({ processorName: 'from' });
      expect(result.canHavePreviousStep).toEqual(false);
      expect(result.canHaveNextStep).toEqual(false);
    });

    it('should allow processors to have previous/next steps', () => {
      const result = abstractVisualEntity.getNodeInteraction({ processorName: 'to' });
      expect(result.canHavePreviousStep).toEqual(true);
      expect(result.canHaveNextStep).toEqual(true);
    });

    it.each([
      'route',
      'from',
      'to',
      'log',
      'onException',
      'onCompletion',
      'intercept',
      'interceptFrom',
      'interceptSendToEndpoint',
    ])(`should return the correct interaction for the '%s' processor`, (processorName) => {
      const result = abstractVisualEntity.getNodeInteraction({ processorName });
      expect(result).toMatchSnapshot();
    });
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

  describe('updateModel', () => {
    it('should update the model with the new value', () => {
      const newUri = 'timer:MyTimer';
      abstractVisualEntity.updateModel('from', { uri: newUri });

      expect(abstractVisualEntity.route.from.uri).toEqual(newUri);
    });

    it('should delegate the serialization to the `CamelComponentSchemaService`', () => {
      const newUri = 'timer:MyTimer';
      const spy = jest.spyOn(CamelComponentSchemaService, 'getUriSerializedDefinition');
      abstractVisualEntity.updateModel('from', { uri: newUri });

      expect(spy).toHaveBeenCalledWith('from', { uri: newUri });
    });
  });
});
