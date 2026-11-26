import { RouteDefinition } from '@kaoto/camel-catalog/types';
import { beforeEach, vi } from 'vitest';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { CatalogKind } from '../../../models/catalog-kind';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows/camel-route-visual-entity';
import {
  collectTopologyEndpoints,
  getAiToolStep,
  getAiToolTagFromKey,
  getRouteSteps,
  normalizeInVmEndpoint,
  parseAiToolTags,
} from './topology-endpoints';

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

    it('collects one consumer key per tag of an ai-tool route', async () => {
      const toolRoute = await buildRouteVizNode({
        id: 'route-tool',
        from: {
          uri: 'ai-tool',
          parameters: { toolName: 'lookupCustomer', tags: 'support, billing' },
          steps: [],
        },
      });

      const { consumersByEndpoint, outgoingByEntity } = await collectTopologyEndpoints([toolRoute]);

      expect(consumersByEndpoint.get('ai-tool-tag:support')).toEqual(['route-tool']);
      expect(consumersByEndpoint.get('ai-tool-tag:billing')).toEqual(['route-tool']);
      expect(outgoingByEntity.size).toBe(0);
    });

    it.each(['openai', 'langchain4j-agent', 'spring-ai-chat'])(
      'collects the tags of a %s step as producer keys',
      async (component) => {
        const agentRoute = await buildRouteVizNode({
          id: 'route-agent',
          from: {
            uri: 'timer:tick',
            steps: [{ to: { uri: component, parameters: { tags: 'support,billing' } } }],
          },
        });

        const { consumersByEndpoint, outgoingByEntity } = await collectTopologyEndpoints([agentRoute]);

        expect(outgoingByEntity.get('route-agent')).toEqual(['ai-tool-tag:support', 'ai-tool-tag:billing']);
        expect(consumersByEndpoint.size).toBe(0);
      },
    );

    it('reads the tags from the uri query string', async () => {
      const agentRoute = await buildRouteVizNode({
        id: 'route-agent',
        from: {
          uri: 'timer:tick',
          steps: [{ to: { uri: 'openai:chat-completion?model=qwen3&tags=support' } }],
        },
      });
      const toolRoute = await buildRouteVizNode({
        id: 'route-tool',
        from: { uri: 'ai-tool:lookupCustomer?tags=support', steps: [] },
      });

      const { consumersByEndpoint, outgoingByEntity } = await collectTopologyEndpoints([agentRoute, toolRoute]);

      expect(outgoingByEntity.get('route-agent')).toEqual(['ai-tool-tag:support']);
      expect(consumersByEndpoint.get('ai-tool-tag:support')).toEqual(['route-tool']);
    });

    it('decodes the tags of the uri query string', async () => {
      const agentRoute = await buildRouteVizNode({
        id: 'route-agent',
        from: {
          uri: 'timer:tick',
          steps: [{ to: { uri: 'openai:chat-completion?tags=support%2Cbilling' } }],
        },
      });

      const { outgoingByEntity } = await collectTopologyEndpoints([agentRoute]);

      expect(outgoingByEntity.get('route-agent')).toEqual(['ai-tool-tag:support', 'ai-tool-tag:billing']);
    });

    it('decodes the tags of the parameters, as Camel adds them to the endpoint uri as they are', async () => {
      const toolRoute = await buildRouteVizNode({
        id: 'route-tool',
        from: { uri: 'ai-tool', parameters: { toolName: 'lookupCustomer', tags: 'support%2Cbilling' }, steps: [] },
      });

      const { consumersByEndpoint } = await collectTopologyEndpoints([toolRoute]);

      expect([...consumersByEndpoint.keys()]).toEqual(['ai-tool-tag:support', 'ai-tool-tag:billing']);
    });

    it('keeps a malformed escape of the uri query string as it is', async () => {
      const agentRoute = await buildRouteVizNode({
        id: 'route-agent',
        from: {
          uri: 'timer:tick',
          steps: [{ to: { uri: 'openai:chat-completion?tags=support%' } }],
        },
      });

      const { outgoingByEntity } = await collectTopologyEndpoints([agentRoute]);

      expect(outgoingByEntity.get('route-agent')).toEqual(['ai-tool-tag:support%']);
    });

    it('does not query the catalog for ai-tool steps', async () => {
      const agentRoute = await buildRouteVizNode({
        id: 'route-agent',
        from: {
          uri: 'ai-tool',
          parameters: { toolName: 'lookupCustomer', tags: 'support' },
          steps: [{ to: { uri: 'openai', parameters: { tags: 'support' } } }],
        },
      });
      /* Building the route queries the catalog as well */
      const getEntitySpy = vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity');
      getEntitySpy.mockClear();

      await collectTopologyEndpoints([agentRoute]);

      expect(getEntitySpy).not.toHaveBeenCalled();
    });

    it('ignores the tags of other components', async () => {
      const route = await buildRouteVizNode({
        id: 'route-other',
        from: {
          uri: 'timer',
          parameters: { timerName: 'tick', tags: 'support' },
          steps: [{ to: { uri: 'log', parameters: { loggerName: 'support', tags: 'support' } } }],
        },
      });

      const { consumersByEndpoint, outgoingByEntity } = await collectTopologyEndpoints([route]);

      expect(consumersByEndpoint.size).toBe(0);
      expect(outgoingByEntity.size).toBe(0);
    });

    it('does not record an agent step without tags', async () => {
      const agentRoute = await buildRouteVizNode({
        id: 'route-agent',
        from: {
          uri: 'timer:tick',
          steps: [{ to: { uri: 'openai', parameters: { operation: 'chat-completion' } } }],
        },
      });

      const { outgoingByEntity } = await collectTopologyEndpoints([agentRoute]);

      expect(outgoingByEntity.size).toBe(0);
    });
  });

  describe('parseAiToolTags', () => {
    it('splits a comma-separated list and trims each tag', () => {
      expect(parseAiToolTags(' support , billing,,  ')).toEqual(['support', 'billing']);
    });

    it('leaves out property placeholders and expressions', () => {
      expect(parseAiToolTags('{{tools.tags}}')).toEqual([]);
      expect(parseAiToolTags('support,{{extra.tags}},${header.tags}')).toEqual(['support']);
      expect(parseAiToolTags('team-{{env}},support')).toEqual(['support']);
    });

    it('leaves out the comma-separated default value of a property placeholder', () => {
      expect(parseAiToolTags('{{tools.tags:support,billing}}')).toEqual([]);
      expect(parseAiToolTags('orders, {{tools.tags:support,billing}}, ${header.tags}')).toEqual(['orders']);
    });

    it('leaves out the default value of a nested property placeholder', () => {
      expect(parseAiToolTags('{{tools.tags:{{fallback.tags}},billing,orders}}')).toEqual([]);
      expect(parseAiToolTags('support, {{tools.tags:{{fallback.tags:a,b}},billing}}, orders')).toEqual([
        'support',
        'orders',
      ]);
    });

    it('leaves out a tag with an unbalanced brace', () => {
      expect(parseAiToolTags('support, ${header.tags, orders')).toEqual(['support']);
      expect(parseAiToolTags('support}, orders')).toEqual(['orders']);
    });

    it('keeps a number or boolean value as a tag', () => {
      expect(parseAiToolTags(42)).toEqual(['42']);
      expect(parseAiToolTags(true)).toEqual(['true']);
    });

    it('returns no tags for a missing or non-scalar value', () => {
      expect(parseAiToolTags(undefined)).toEqual([]);
      expect(parseAiToolTags('')).toEqual([]);
      expect(parseAiToolTags({ tags: 'support' })).toEqual([]);
    });
  });

  describe('getAiToolTagFromKey', () => {
    it('returns the tag of an ai-tool tag key', () => {
      expect(getAiToolTagFromKey('ai-tool-tag:support')).toBe('support');
    });

    it('returns undefined for an in-vm endpoint', () => {
      expect(getAiToolTagFromKey('direct:support')).toBeUndefined();
    });
  });

  describe('getRouteSteps', () => {
    it('returns the steps of a route, inside its containers, without the placeholders', async () => {
      const vizNode = await buildRouteVizNode({
        id: 'route',
        from: {
          uri: 'direct:start',
          steps: [
            { log: { message: 'first' } },
            { choice: { when: [{ simple: { expression: '${body}' }, steps: [{ to: { uri: 'openai' } }] }] } },
          ],
        },
      });

      expect(getRouteSteps(vizNode).map((step) => step.data.path)).toEqual([
        'route.from',
        'route.from.steps.0.log',
        'route.from.steps.1.choice.when.0.steps.0.to',
      ]);
    });
  });

  describe('getAiToolStep', () => {
    const getSteps = async (route: RouteDefinition) => getRouteSteps(await buildRouteVizNode(route));

    it('tells a tool route by its ai-tool consumer, with its tags', async () => {
      const [from] = await getSteps({
        from: { uri: 'ai-tool', parameters: { toolName: 'lookup', tags: 'support, billing' }, steps: [] },
      });

      expect(getAiToolStep(from)).toEqual({ role: 'tool', tags: ['support', 'billing'] });
    });

    it('tells an agent step by its component, with the tags of its uri', async () => {
      const [, agent] = await getSteps({
        from: { uri: 'direct:start', steps: [{ wireTap: { uri: 'spring-ai-chat:chat?tags=support%2Cbilling' } }] },
      });

      expect(getAiToolStep(agent)).toEqual({ role: 'agent', tags: ['support', 'billing'] });
    });

    it('reads a plus in the tags as a space, as Camel decodes the endpoint options', async () => {
      const [, agent] = await getSteps({
        from: { uri: 'direct:start', steps: [{ toD: { uri: 'openai:chat-completion?tags=customer+support,orders' } }] },
      });

      expect(getAiToolStep(agent)?.tags).toEqual(['customer support', 'orders']);
    });

    it('keeps the tags of a query string as they are written', async () => {
      const [, agent] = await getSteps({
        from: { uri: 'direct:start', steps: [{ wireTap: { uri: 'langchain4j-agent:agent?tags=001' } }] },
      });

      expect(getAiToolStep(agent)?.tags).toEqual(['001']);
    });

    it('takes the tags of a RAW value as they are', async () => {
      const [, agent] = await getSteps({
        from: {
          uri: 'direct:start',
          steps: [{ to: { uri: 'openai', parameters: { tags: 'RAW(customer+support,a%2Cb)' } } }],
        },
      });

      expect(getAiToolStep(agent)?.tags).toEqual(['customer+support', 'a%2Cb']);
    });

    it('keeps the question marks after the first one in the query of the uri', async () => {
      const [, agent] = await getSteps({
        from: { uri: 'direct:start', steps: [{ wireTap: { uri: 'openai:chat?tags={{?optional}},billing' } }] },
      });

      expect(getAiToolStep(agent)?.tags).toEqual(['billing']);
    });

    it('returns undefined for the other steps', async () => {
      const [from, log, aiToolProducer] = await getSteps({
        from: {
          uri: 'direct:start',
          steps: [{ log: { message: 'hello' } }, { to: { uri: 'ai-tool', parameters: { tags: 'support' } } }],
        },
      });

      expect(getAiToolStep(from)).toBeUndefined();
      expect(getAiToolStep(log)).toBeUndefined();
      expect(getAiToolStep(aiToolProducer)).toBeUndefined();
    });
  });
});
