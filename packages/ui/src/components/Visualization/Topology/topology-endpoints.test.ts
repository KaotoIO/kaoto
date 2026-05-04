import { RouteDefinition } from '@kaoto/camel-catalog/types';
import { beforeEach, vi } from 'vitest';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { CatalogKind } from '../../../models/catalog-kind';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows/camel-route-visual-entity';
import { collectTopologyEndpoints, normalizeInVmEndpoint } from './topology-endpoints';

const buildRouteVizNode = async (route: RouteDefinition) => {
  const entity = new CamelRouteVisualEntity({ route });
  return entity.toVizNode();
};

describe('topology-endpoints', () => {
  beforeEach(() => {
    // Mock DynamicCatalogRegistry to return component definitions
    const registryInstance = DynamicCatalogRegistry.get();
    vi.spyOn(registryInstance, 'getEntity').mockImplementation(async (kind: CatalogKind, name: string) => {
      if (kind === CatalogKind.Component && (name === 'direct' || name === 'seda' || name === 'vm')) {
        return {
          component: {
            kind: CatalogKind.Component,
            name,
            title: name,
            deprecated: false,
            label: '',
            version: '1.0.0',
            syntax: `${name}:name`,
          },
          componentProperties: {},
          properties: {},
          propertiesSchema: {
            required: ['name'],
          },
        };
      }
      return undefined;
    });
  });

  describe('normalizeInVmEndpoint', () => {
    it('keeps in-vm endpoints without query params', () => {
      expect(normalizeInVmEndpoint('direct:foo')).toBe('direct:foo');
      expect(normalizeInVmEndpoint('seda:bar')).toBe('seda:bar');
    });

    it('strips query params from in-vm endpoints', () => {
      expect(normalizeInVmEndpoint('direct:foo?bridgeErrorHandler=true')).toBe('direct:foo');
    });

    it('returns undefined for non in-vm schemes', () => {
      expect(normalizeInVmEndpoint('timer:tutorial')).toBeUndefined();
      expect(normalizeInVmEndpoint('amqp:queue:')).toBeUndefined();
    });
  });

  describe('collectTopologyEndpoints', () => {
    it('collects consumer from route from and producer from to steps', async () => {
      const producerRoute = await buildRouteVizNode({
        id: 'route-producer',
        from: {
          uri: 'timer:tick',
          steps: [{ to: { uri: 'direct', parameters: { name: 'shared' } } }],
        },
      });
      const consumerRoute = await buildRouteVizNode({
        id: 'route-consumer',
        from: { uri: 'direct', parameters: { name: 'shared' }, steps: [] },
      });

      const { consumersByEndpoint, outgoingByEntity } = await collectTopologyEndpoints([producerRoute, consumerRoute]);

      expect(consumersByEndpoint.get('direct:shared')).toEqual(['route-consumer']);
      expect(outgoingByEntity.get('route-producer')).toEqual(['direct:shared']);
    });

    it('canonicalizes direct uri from parameters.name', async () => {
      const route = await buildRouteVizNode({
        id: 'route-a',
        from: { uri: 'direct', parameters: { name: 'orders' }, steps: [] },
      });

      const { consumersByEndpoint } = await collectTopologyEndpoints([route]);

      expect(consumersByEndpoint.get('direct:orders')).toEqual(['route-a']);
    });

    it('appends multiple consumers for the same endpoint', async () => {
      const routeA = await buildRouteVizNode({
        id: 'route-a',
        from: { uri: 'direct', parameters: { name: 'fanout' }, steps: [] },
      });
      const routeB = await buildRouteVizNode({
        id: 'route-b',
        from: { uri: 'direct', parameters: { name: 'fanout' }, steps: [] },
      });

      const { consumersByEndpoint } = await collectTopologyEndpoints([routeA, routeB]);

      expect(consumersByEndpoint.get('direct:fanout')).toEqual(['route-a', 'route-b']);
    });
  });
});
