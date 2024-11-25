import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { cloneDeep } from 'lodash';
import * as routeStub from '../../../stubs/camel-route';
import * as kameletStub from '../../../stubs/kamelet-route';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CamelRouteResource, KameletResource, PipeResource } from '../../camel';
import { CatalogKind } from '../../catalog-kind';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { CamelCatalogService } from '../flows';
import { BeansEntityHandler } from './beans-entity-handler';

describe('BeansEntityHandler', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
  });

  describe('should handle beans in CamelRouteResource', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let model: any;
    let beansHandler: BeansEntityHandler;
    beforeEach(() => {
      model = cloneDeep(routeStub.camelRouteJson);
      const camelRouteResource = new CamelRouteResource(model);
      beansHandler = new BeansEntityHandler(camelRouteResource);
    });

    it('initial state', () => {
      expect(model.beans).toBeUndefined();
      expect(beansHandler.isSupported()).toBeTruthy();
      const beanSchema = beansHandler.getBeanSchema();
      expect(beanSchema!.properties!.builderClass.title).toEqual('Builder Class');
      expect(beanSchema!.properties!.script.title).toEqual('Script');
      const beansSchema = beansHandler.getBeansSchema();
      expect((beansSchema!.items as KaotoSchemaDefinition['schema'])['$ref']).toContain('BeanFactoryDefinition');
      expect(beansHandler.getBeansEntity()).toBeUndefined();
      expect(beansHandler.getBeansModel()).toBeUndefined();
    });

    it('reference quote', () => {
      expect(beansHandler.getReferenceQuote()).toEqual('#');
      expect(beansHandler.getReferenceFromName('myBean')).toEqual('#myBean');
      expect(beansHandler.stripReferenceQuote('#myBean')).toEqual('myBean');
    });

    it('create and delete bean entity', () => {
      beansHandler.createBeansEntity();
      expect(beansHandler.getBeansEntity()?.type).toEqual('beans');
      expect(beansHandler.getBeansModel()).toEqual([]);
      beansHandler.setBeansModel([
        { name: 'myBean1', type: 'myType1', properties: { p: 'v' } },
        { name: 'myBean2', type: 'myType2', properties: { p: 'v' } },
      ]);
      expect(beansHandler.getBeansModel()?.length).toEqual(2);
      const nameAndType = beansHandler.getAllBeansNameAndType();
      expect(nameAndType.length).toEqual(2);
      expect(nameAndType).toEqual([
        { name: 'myBean1', type: 'myType1' },
        { name: 'myBean2', type: 'myType2' },
      ]);
      beansHandler.addNewBean({ name: 'myBean3', type: 'myType3' });
      expect(beansHandler.getBeansModel()?.length).toEqual(3);
      const entity = beansHandler.getBeansEntity();
      expect(entity).toBeDefined();
      beansHandler.deleteBeansEntity(entity!);
      expect(beansHandler.getBeansEntity()).toBeUndefined();
      expect(beansHandler.getBeansModel()).toBeUndefined();
    });
  });

  describe('should handle beans in KameletResource', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let model: any;
    let beansHandler: BeansEntityHandler;
    beforeEach(() => {
      model = cloneDeep(kameletStub.kameletJson);
      const kameletResource = new KameletResource(model);
      beansHandler = new BeansEntityHandler(kameletResource);
    });

    it('initial state', () => {
      expect(model.spec.template.beans).toBeUndefined();
      expect(beansHandler.isSupported()).toBeTruthy();
      const beanSchema = beansHandler.getBeanSchema();
      expect(beanSchema?.properties!.builderClass).toBeDefined();
      expect(beanSchema?.properties!.script.title).toEqual('Script');
      const beansSchema = beansHandler.getBeansSchema();
      expect((beansSchema?.items as KaotoSchemaDefinition['schema']).properties!.scriptLanguage.title).toEqual(
        'Script Language',
      );
      expect((beansSchema?.items as KaotoSchemaDefinition['schema']).properties!.builderClass).toBeDefined();
      expect(beansHandler.getBeansEntity()).toBeUndefined();
      expect(beansHandler.getBeansModel()).toBeUndefined();
    });

    it('reference quote', () => {
      expect(beansHandler.getReferenceQuote()).toEqual('#bean:{{}}');
      expect(beansHandler.getReferenceFromName('myBean')).toEqual('#bean:{{myBean}}');
      expect(beansHandler.stripReferenceQuote('#bean:{{myBean}}')).toEqual('myBean');
    });

    it('create and delete bean entity', () => {
      beansHandler.createBeansEntity();
      expect(beansHandler.getBeansEntity()?.type).toEqual('beans');
      expect(beansHandler.getBeansModel()).toEqual([]);
      beansHandler.setBeansModel([
        { name: 'myBean1', type: 'myType1', properties: { p: 'v' } },
        { name: 'myBean2', type: 'myType2', properties: { p: 'v' } },
      ]);
      expect(beansHandler.getBeansModel()?.length).toEqual(2);
      const nameAndType = beansHandler.getAllBeansNameAndType();
      expect(nameAndType.length).toEqual(2);
      expect(nameAndType).toEqual([
        { name: 'myBean1', type: 'myType1' },
        { name: 'myBean2', type: 'myType2' },
      ]);
      beansHandler.addNewBean({ name: 'myBean3', type: 'myType3' });
      expect(beansHandler.getBeansModel()?.length).toEqual(3);
      const entity = beansHandler.getBeansEntity();
      expect(entity).toBeDefined();
      beansHandler.deleteBeansEntity(entity!);
      expect(beansHandler.getBeansEntity()).toBeUndefined();
      expect(beansHandler.getBeansModel()).toBeUndefined();
    });
  });

  describe('should handle erroneous CamelResource', () => {
    it('if CamelResource is undefined', () => {
      const beansHandler = new BeansEntityHandler();
      expect(beansHandler.isSupported()).toBeFalsy();
      expect(beansHandler.stripReferenceQuote('#myBean')).toBeUndefined();
      beansHandler.addNewBean({ name: 'myBean', type: 'myType' });
      expect(beansHandler.getBeansEntity()).toBeUndefined();
      beansHandler.setBeansModel([{ name: 'myBean', type: 'myType' }]);
      expect(beansHandler.getReferenceFromName('myBean')).toBeUndefined();
      expect(beansHandler.stripReferenceQuote('#myBean')).toBeUndefined();
    });

    it('if CamelResource is not the supported one', () => {
      const camelResource = new PipeResource({});
      const beansHandler = new BeansEntityHandler(camelResource);
      expect(beansHandler.isSupported()).toBeFalsy();
      expect(beansHandler.stripReferenceQuote('#myBean')).toBeUndefined();
      beansHandler.addNewBean({ name: 'myBean', type: 'myType' });
      expect(beansHandler.getBeansEntity()).toBeUndefined();
      beansHandler.setBeansModel([{ name: 'myBean', type: 'myType' }]);
      expect(beansHandler.getReferenceFromName('myBean')).toBeUndefined();
      expect(beansHandler.stripReferenceQuote('#myBean')).toBeUndefined();
    });
  });
});
