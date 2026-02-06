import { BaseVisualCamelEntity } from '..';
import { DirectRouteNavigationService } from './direct-route-navigation.service';
import { EntityType } from './entities';

describe('DirectRouteNavigationService', () => {
  describe('getDirectEndpointNameFromDefinition', () => {
    it.each([
      [{ uri: 'direct:addPet' }, 'addPet'],
      [{ uri: 'direct:addPet?block=true' }, 'addPet'],
      [{ uri: 'direct', parameters: { name: 'addPet' } }, 'addPet'],
      ['direct:addPet', 'addPet'],
      [{ uri: 'seda:addPet' }, undefined],
      [{ uri: 'direct' }, undefined],
    ])('should return `%s` for `%s`', (definition, expected) => {
      expect(DirectRouteNavigationService.getDirectEndpointNameFromDefinition(definition)).toBe(expected);
    });
  });

  describe('findDirectConsumerRouteId', () => {
    const createMockEntity = (options: {
      id: string;
      type?: EntityType;
      fromDefinition?: unknown;
      routeDefinition?: unknown;
    }): BaseVisualCamelEntity => {
      return {
        id: options.id,
        type: options.type ?? EntityType.Route,
        getRootPath: () => 'route',
        getNodeDefinition: (_path?: string) => options.fromDefinition,
        toJSON: () => ({ route: options.routeDefinition }),
      } as unknown as BaseVisualCamelEntity;
    };

    it('should resolve a route when matching from uri is direct:name', () => {
      const entities = [
        createMockEntity({ id: 'route-1', fromDefinition: { uri: 'direct:addPet' }, routeDefinition: {} }),
        createMockEntity({ id: 'route-2', fromDefinition: { uri: 'direct:other' }, routeDefinition: {} }),
      ];

      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectConsumerRouteId('addPet')).toBe('route-1');
    });

    it('should resolve a route when matching from uri uses parameters.name', () => {
      const entities = [
        createMockEntity({
          id: 'route-1',
          fromDefinition: { uri: 'direct', parameters: { name: 'addPet' } },
          routeDefinition: {},
        }),
      ];

      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectConsumerRouteId('addPet')).toBe('route-1');
    });

    it('should return undefined when there is no match', () => {
      const entities = [
        createMockEntity({ id: 'route-1', fromDefinition: { uri: 'direct:addPet' }, routeDefinition: {} }),
      ];

      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectConsumerRouteId('deletePet')).toBeUndefined();
    });

    it('should return undefined when more than one route matches', () => {
      const entities = [
        createMockEntity({ id: 'route-1', fromDefinition: { uri: 'direct:addPet' }, routeDefinition: {} }),
        createMockEntity({
          id: 'route-2',
          fromDefinition: { uri: 'direct', parameters: { name: 'addPet' } },
          routeDefinition: {},
        }),
      ];

      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectConsumerRouteId('addPet')).toBeUndefined();
    });

    it('should ignore non-route entities', () => {
      const entities = [
        createMockEntity({ id: 'route-1', fromDefinition: { uri: 'direct:addPet' }, routeDefinition: {} }),
        createMockEntity({
          id: 'rest-1',
          type: EntityType.Rest,
          fromDefinition: { uri: 'direct:addPet' },
          routeDefinition: {},
        }),
      ];

      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectConsumerRouteId('addPet')).toBe('route-1');
    });
  });

  describe('findDirectCallerRouteId', () => {
    const createMockEntity = (options: {
      id: string;
      type?: EntityType;
      routeDefinition?: unknown;
      restDefinition?: unknown;
    }): BaseVisualCamelEntity => {
      return {
        id: options.id,
        type: options.type ?? EntityType.Route,
        toJSON: () => ({ route: options.routeDefinition, rest: options.restDefinition }),
      } as unknown as BaseVisualCamelEntity;
    };

    it('should resolve caller route for direct:addPet string notation', () => {
      const entities = [
        createMockEntity({
          id: 'route-caller',
          routeDefinition: { from: { uri: 'direct:start', steps: [{ to: 'direct:addPet' }] } },
        }),
        createMockEntity({ id: 'route-target', routeDefinition: { from: { uri: 'direct:addPet', steps: [] } } }),
      ];

      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectCallerRouteId('addPet', 'route-target')).toBe('route-caller');
    });

    it('should resolve caller route for uri: direct + parameters.name notation', () => {
      const entities = [
        createMockEntity({
          id: 'route-caller',
          routeDefinition: {
            from: { uri: 'direct:start', steps: [{ to: { uri: 'direct', parameters: { name: 'addPet' } } }] },
          },
        }),
      ];

      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectCallerRouteId('addPet')).toBe('route-caller');
    });

    it('should return undefined when there is no caller route', () => {
      const entities = [
        createMockEntity({
          id: 'route-caller',
          routeDefinition: { from: { uri: 'direct:start', steps: [{ to: 'direct:deletePet' }] } },
        }),
      ];

      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectCallerRouteId('addPet')).toBeUndefined();
    });

    it('should return undefined when more than one caller route exists', () => {
      const entities = [
        createMockEntity({
          id: 'route-caller-1',
          routeDefinition: { from: { uri: 'direct:start', steps: [{ to: 'direct:addPet' }] } },
        }),
        createMockEntity({
          id: 'route-caller-2',
          routeDefinition: { from: { uri: 'direct:start2', steps: [{ to: { uri: 'direct:addPet' } }] } },
        }),
      ];

      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectCallerRouteId('addPet')).toBeUndefined();
      expect(navigationService.findDirectCallerRouteIds('addPet')).toEqual(['route-caller-1', 'route-caller-2']);
    });

    it('should resolve caller when the caller is a rest operation', () => {
      const entities = [
        createMockEntity({
          id: 'rest-1',
          type: EntityType.Rest,
          restDefinition: {
            get: [{ path: '/pets', to: { uri: 'direct:addPet' } }],
          },
        }),
        createMockEntity({ id: 'route-target', routeDefinition: { from: { uri: 'direct:addPet', steps: [] } } }),
      ];

      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectCallerRouteId('addPet', 'route-target')).toBe('rest-1');
    });

    it('should return undefined when direct endpoint name is empty', () => {
      const entities = [
        createMockEntity({
          id: 'route-caller',
          routeDefinition: { from: { uri: 'direct:start', steps: [{ to: 'direct:addPet' }] } },
        }),
      ];

      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectCallerRouteId('')).toBeUndefined();
      expect(navigationService.findDirectCallerRouteIds('')).toEqual([]);
    });

    it('should exclude target route id from caller matches', () => {
      const entities = [
        createMockEntity({
          id: 'route-target',
          routeDefinition: { from: { uri: 'direct:start', steps: [{ to: 'direct:addPet' }] } },
        }),
        createMockEntity({
          id: 'route-caller',
          routeDefinition: { from: { uri: 'direct:start-2', steps: [{ to: 'direct:addPet' }] } },
        }),
      ];

      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectCallerRouteIds('addPet', 'route-target')).toEqual(['route-caller']);
    });
  });

  describe('findDirectNodeIds', () => {
    type MockVizNode = {
      data: {
        processorName: string;
        componentName?: string;
      };
      getId: () => string;
      getNodeDefinition: () => unknown;
      getChildren: () => MockVizNode[] | undefined;
    };

    const createMockVizNode = (options: {
      id: string;
      processorName: string;
      componentName?: string;
      definition?: unknown;
      children?: MockVizNode[];
    }): MockVizNode => {
      return {
        data: {
          processorName: options.processorName,
          componentName: options.componentName,
        },
        getId: () => options.id,
        getNodeDefinition: () => options.definition,
        getChildren: () => options.children,
      } as never;
    };

    const createMockEntity = (id: string, rootNode: MockVizNode): BaseVisualCamelEntity => {
      return {
        id,
        type: EntityType.Route,
        toVizNode: () => rootNode as never,
      } as unknown as BaseVisualCamelEntity;
    };

    it('should resolve direct consumer node id inside the target route', () => {
      const consumerNode = createMockVizNode({
        id: 'from-direct-node',
        processorName: 'from',
        componentName: 'direct',
        definition: { uri: 'direct:addPet' },
      });
      const root = createMockVizNode({
        id: 'root-node',
        processorName: 'route',
        children: [consumerNode],
      });
      const entities = [createMockEntity('route-target', root)];

      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectConsumerNodeId('route-target', 'addPet')).toBe('from-direct-node');
    });

    it('should resolve direct caller node id inside the target route', () => {
      const callerNode = createMockVizNode({
        id: 'to-direct-node',
        processorName: 'to',
        componentName: 'direct',
        definition: { uri: 'direct:addPet' },
      });
      const root = createMockVizNode({
        id: 'root-node',
        processorName: 'route',
        children: [callerNode],
      });
      const entities = [createMockEntity('route-caller', root)];

      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectCallerNodeId('route-caller', 'addPet')).toBe('to-direct-node');
    });

    it('should return undefined when route does not exist', () => {
      const entities: BaseVisualCamelEntity[] = [];
      const navigationService = new DirectRouteNavigationService(entities);
      expect(navigationService.findDirectConsumerNodeId('missing-route', 'addPet')).toBeUndefined();
      expect(navigationService.findDirectCallerNodeId('missing-route', 'addPet')).toBeUndefined();
    });
  });
});
