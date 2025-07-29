import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, RouteConfigurationDefinition } from '@kaoto/camel-catalog/types';
import { routeConfigurationStub } from '../../../stubs/route-configuration';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CatalogKind } from '../../catalog-kind';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { CamelRouteConfigurationVisualEntity } from './camel-route-configuration-visual-entity';

describe('CamelRouteConfigurationVisualEntity', () => {
  const ROUTE_CONFIGURATION_ID_REGEXP = /^routeConfiguration-[a-zA-Z0-9]{4}$/;
  let routeConfigurationDef: { routeConfiguration: RouteConfigurationDefinition };

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
  });

  beforeEach(() => {
    routeConfigurationDef = {
      routeConfiguration: {
        ...routeConfigurationStub.routeConfiguration,
      },
    };
  });

  describe('isApplicable', () => {
    it.each([
      [true, { routeConfiguration: {} }],
      [true, { routeConfiguration: { intercept: [] } }],
      [true, routeConfigurationStub],
      [false, { from: { id: 'from-1234', steps: [] } }],
      [false, { routeConfiguration: { intercept: [] }, anotherProperty: true }],
    ])('should return %s for %s', (result, definition) => {
      expect(CamelRouteConfigurationVisualEntity.isApplicable(definition)).toEqual(result);
    });
  });

  describe('function Object() { [native code] }', () => {
    it('should set id to generated id', () => {
      const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);

      expect(entity.id).toMatch(ROUTE_CONFIGURATION_ID_REGEXP);
    });
  });

  it('should return id', () => {
    const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);

    expect(entity.getId()).toMatch(ROUTE_CONFIGURATION_ID_REGEXP);
  });

  it('should set id', () => {
    const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);
    const newId = 'newId';
    entity.setId(newId);

    expect(entity.getId()).toEqual(newId);
  });

  it('should delegate to super return node label', () => {
    const superGetNodeLabelSpy = jest
      .spyOn(AbstractCamelVisualEntity.prototype, 'getNodeLabel')
      .mockReturnValueOnce('label');
    const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);

    expect(entity.getNodeLabel()).toEqual('label');
    expect(superGetNodeLabelSpy).toHaveBeenCalled();
  });

  it('should return tooltip content', () => {
    const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);

    expect(entity.getTooltipContent(CamelRouteConfigurationVisualEntity.ROOT_PATH)).toEqual('routeConfiguration');
  });

  it('should delegate to super to return tooltip content', () => {
    const superGetTooltipContentSpy = jest
      .spyOn(AbstractCamelVisualEntity.prototype, 'getTooltipContent')
      .mockReturnValueOnce('tooltip');
    const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);

    expect(entity.getTooltipContent()).toEqual('tooltip');
    expect(superGetTooltipContentSpy).toHaveBeenCalled();
  });

  describe('getComponentSchema', () => {
    it('should return entity current definition', () => {
      const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);

      expect(entity.getComponentSchema(CamelRouteConfigurationVisualEntity.ROOT_PATH)?.definition).toEqual(
        routeConfigurationDef.routeConfiguration,
      );
    });

    it('should return schema from store', () => {
      const catalogServiceSpy = jest.spyOn(CamelCatalogService, 'getComponent');

      const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);
      entity.getComponentSchema(CamelRouteConfigurationVisualEntity.ROOT_PATH);

      expect(catalogServiceSpy).toHaveBeenCalledWith(CatalogKind.Entity, 'routeConfiguration');
    });
  });

  describe('updateModel', () => {
    it('should update model', () => {
      const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);
      const path = 'routeConfiguration.description';
      const value = 'This is a Route configuration node';

      entity.updateModel(path, value);

      expect(routeConfigurationDef.routeConfiguration.description).toEqual(value);
    });

    it('should not update model if path is not defined', () => {
      const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);
      const value = 'This is a Route configuration node';

      entity.updateModel(undefined, value);

      expect(routeConfigurationDef.routeConfiguration.description).toBeUndefined();
    });

    it('should reset the routeConfiguration object if it is not defined', () => {
      const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);

      entity.updateModel('routeConfiguration', {});

      expect(routeConfigurationDef.routeConfiguration).toEqual({});
    });
  });

  it('return no interactions for ROOT_PATH', () => {
    const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);

    expect(entity.getNodeInteraction({ path: CamelRouteConfigurationVisualEntity.ROOT_PATH })).toEqual({
      canHavePreviousStep: false,
      canHaveNextStep: false,
      canHaveChildren: false,
      canHaveSpecialChildren: true,
      canRemoveStep: false,
      canReplaceStep: false,
      canRemoveFlow: true,
      canBeDisabled: false,
    });
  });

  it('should delegate to super to return interactions for non ROOT_PATH', () => {
    const mockInteractions = {
      canHavePreviousStep: true,
      canHaveNextStep: true,
      canHaveChildren: true,
      canHaveSpecialChildren: true,
      canRemoveStep: true,
      canReplaceStep: true,
      canRemoveFlow: true,
      canBeDisabled: true,
    };
    const superGetNodeInteractionSpy = jest
      .spyOn(AbstractCamelVisualEntity.prototype, 'getNodeInteraction')
      .mockReturnValueOnce(mockInteractions);

    const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);
    const result = entity.getNodeInteraction({ path: 'another path' });

    expect(superGetNodeInteractionSpy).toHaveBeenCalled();
    expect(result).toEqual(mockInteractions);
  });

  describe('getNodeValidationText', () => {
    it('should return undefined for valid definitions', () => {
      const entity = new CamelRouteConfigurationVisualEntity({
        routeConfiguration: {
          ...routeConfigurationDef.routeConfiguration,
        },
      });

      expect(entity.getNodeValidationText()).toBeUndefined();
    });

    it('should not modify the original definition when validating', () => {
      const originalRouteConfigurationDef: RouteConfigurationDefinition = {
        ...routeConfigurationDef.routeConfiguration,
      };
      const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);

      entity.getNodeValidationText();

      expect(routeConfigurationDef.routeConfiguration).toEqual(originalRouteConfigurationDef);
    });
  });

  describe('toVizNode', () => {
    it('should return visualization node', () => {
      const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);

      const vizNode = entity.toVizNode().nodes[0];

      expect(vizNode.data).toEqual({
        entity,
        icon: '',
        isGroup: true,
        path: 'routeConfiguration',
        processorName: 'routeConfiguration',
      });
    });

    it('should return hardcoded schema title', () => {
      const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);
      const vizNode = entity.toVizNode().nodes[0];

      expect(vizNode.getNodeTitle()).toEqual('Route Configuration');
    });
  });

  it('should serialize the routeConfiguration definition', () => {
    const entity = new CamelRouteConfigurationVisualEntity(routeConfigurationDef);

    expect(entity.toJSON()).toEqual(routeConfigurationDef);
  });
});
