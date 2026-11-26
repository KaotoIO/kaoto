import { EdgeStyle } from '@patternfly/react-topology';
import { beforeEach, vi } from 'vitest';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { CatalogKind } from '../../../models/catalog-kind';
import { EntityType } from '../../../models/entities';
import { CamelRouteVisualEntity, createVisualizationNode } from '../../../models/visualization';
import { camelRouteJson } from '../../../stubs/camel-route';
import { FlowService } from './flow.service';

describe('FlowService', () => {
  beforeEach(() => {
    FlowService.nodes = [];
    FlowService.edges = [];

    // Mock DynamicCatalogRegistry for topology tests
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

  it('should start with an empty nodes array', () => {
    expect(FlowService.nodes).toEqual([]);
  });

  it('should start with an empty edges array', () => {
    expect(FlowService.edges).toEqual([]);
  });

  describe('getFlowDiagram', () => {
    it('should return nodes and edges for a simple VisualizationNode', () => {
      const vizNode = createVisualizationNode('node', {
        name: EntityType.Route,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });

      const { nodes, edges } = FlowService.getFlowDiagram('test', vizNode);

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return nodes and edges for a group with children', () => {
      const groupVizNode = createVisualizationNode('group', {
        name: EntityType.Route,
        isGroup: true,
        isPlaceholder: false,
        iconUrl: '',
        title: '',
        description: '',
      });
      const child1VizNode = createVisualizationNode('child1', {
        name: EntityType.Route,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });
      const child2VizNode = createVisualizationNode('child2', {
        name: EntityType.Route,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });
      groupVizNode.addChild(child1VizNode);
      groupVizNode.addChild(child2VizNode);

      const { nodes, edges } = FlowService.getFlowDiagram('test', groupVizNode);

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return nodes and edges for a two-nodes VisualizationNode', () => {
      const vizNode = createVisualizationNode('node', {
        name: EntityType.Route,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });
      const childNode = createVisualizationNode('child', {
        name: EntityType.Route,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });
      vizNode.addChild(childNode);

      const { nodes, edges } = FlowService.getFlowDiagram('test', vizNode);

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return nodes and edges for a multiple nodes VisualizationNode', () => {
      const baseData = {
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      };
      const vizNode = createVisualizationNode('node', { name: EntityType.Route, ...baseData });

      const setHeaderNode = createVisualizationNode('set-header', {
        name: EntityType.Route,
        ...baseData,
      });
      vizNode.setNextNode(setHeaderNode);
      setHeaderNode.setPreviousNode(vizNode);

      const choiceNode = createVisualizationNode('choice', { name: EntityType.Route, ...baseData });
      setHeaderNode.setNextNode(choiceNode);
      choiceNode.setPreviousNode(setHeaderNode);

      const directNode = createVisualizationNode('direct', { name: EntityType.Route, ...baseData });
      choiceNode.setNextNode(directNode);
      directNode.setPreviousNode(choiceNode);

      const whenNode = createVisualizationNode('when', { name: EntityType.Route, ...baseData });
      choiceNode.addChild(whenNode);

      const otherwiseNode = createVisualizationNode('otherwise', {
        name: EntityType.Route,
        ...baseData,
      });
      choiceNode.addChild(otherwiseNode);

      const whenLeafNode = createVisualizationNode('when-leaf', {
        name: EntityType.Route,
        ...baseData,
      });
      whenNode.addChild(whenLeafNode);

      const processNode = createVisualizationNode('process', {
        name: EntityType.Route,
        ...baseData,
      });
      otherwiseNode.addChild(processNode);
      const logNode = createVisualizationNode('log', { name: EntityType.Route, ...baseData });
      processNode.addChild(logNode);

      const { nodes, edges } = FlowService.getFlowDiagram('test', vizNode);

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return a group node for a multiple nodes VisualizationNode with a group', async () => {
      const routeNode = await new CamelRouteVisualEntity({ from: { uri: 'timer:clock', steps: [] } }).toVizNode();

      const { nodes, edges } = FlowService.getFlowDiagram('test', routeNode);

      expect(nodes).toHaveLength(3);
      expect(nodes[0].data?.vizNode?.data.path).toBe('route.from');
      expect(nodes[1].data?.vizNode?.data.path).toBe('route.from.steps.0.placeholder');
      expect(nodes[2].data?.vizNode?.data.path).toBe('route');

      expect(edges).toHaveLength(1);
      expect(edges[0].source).toBe('test|route.from');
      expect(edges[0].target).toBe('test|route.from.steps.0.placeholder');

      const group = nodes[nodes.length - 1];
      expect(group.children).toEqual(['test|route.from', 'test|route.from.steps.0.placeholder']);
      expect(group.group).toBeTruthy();
    });

    it('should remove placeholders', async () => {
      const routeNode = await new CamelRouteVisualEntity(camelRouteJson).toVizNode();

      const { nodes, edges } = FlowService.getFlowDiagram('test', routeNode, { removePlaceholder: true });
      nodes.forEach((node) => {
        delete node.data!.vizNode;
      });

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should scope nodes & edges IDs', async () => {
      const routeNode = await new CamelRouteVisualEntity({
        route: { id: 'route-8888', from: { uri: 'timer:clock', steps: [{ to: { uri: 'log' } }] } },
      }).toVizNode();

      const { nodes, edges } = FlowService.getFlowDiagram('test', routeNode);

      expect(nodes).toHaveLength(4);
      expect(nodes[0].id).toBe('test|route.from');
      expect(nodes[1].id).toBe('test|route.from.steps.0.to');
      expect(nodes[2].id).toBe('test|route.from.steps.1.placeholder');
      expect(nodes[3].id).toBe('test|route');

      expect(edges).toHaveLength(2);
      expect(edges[0].id).toBe('test|route.from >>> route.from.steps.0.to');
      expect(edges[0].source).toBe('test|route.from');
      expect(edges[0].target).toBe('test|route.from.steps.0.to');

      expect(edges[1].id).toBe('test|route.from.steps.0.to >>> route.from.steps.1.placeholder');
      expect(edges[1].source).toBe('test|route.from.steps.0.to');
      expect(edges[1].target).toBe('test|route.from.steps.1.placeholder');
    });
  });

  describe('getTopologyFlowDiagram', () => {
    it('builds one topology node per route and cross-route edges for matching in-vm endpoints', async () => {
      const producerRoute = await new CamelRouteVisualEntity({
        route: {
          id: 'route-producer',
          from: {
            uri: 'timer:tick',
            steps: [{ to: { uri: 'direct', parameters: { name: 'shared' } } }],
          },
        },
      }).toVizNode();
      const consumerRoute = await new CamelRouteVisualEntity({
        route: {
          id: 'route-consumer',
          from: { uri: 'direct', parameters: { name: 'shared' }, steps: [] },
        },
      }).toVizNode();

      const { nodes, edges } = await FlowService.getTopologyFlowDiagram([producerRoute, consumerRoute]);

      expect(nodes).toHaveLength(2);
      expect(nodes.map((node) => node.id).sort()).toEqual(['route-consumer', 'route-producer']);
      expect(nodes.every((node) => node.type === 'topology-node')).toBe(true);

      expect(edges).toHaveLength(1);
      expect(edges[0]).toMatchObject({
        type: 'topology-edge',
        source: 'route-producer',
        target: 'route-consumer',
        edgeStyle: EdgeStyle.solid,
      });
      expect(edges[0].label).toBeUndefined();
    });

    describe('ai-tool routes', () => {
      const getToolRoute = (id: string, tags?: string) =>
        new CamelRouteVisualEntity({
          route: {
            id,
            from: {
              uri: 'ai-tool',
              parameters: { toolName: id, description: `Tool ${id}`, ...(tags === undefined ? {} : { tags }) },
              steps: [{ setBody: { constant: '{}' } }],
            },
          },
        }).toVizNode();

      const getAgentRoute = (id: string, ...agentSteps: Array<{ uri: string; tags: string }>) =>
        new CamelRouteVisualEntity({
          route: {
            id,
            from: {
              uri: 'platform-http',
              parameters: { path: '/support' },
              steps: agentSteps.map(({ uri, tags }) => ({ to: { uri, parameters: { tags } } })),
            },
          },
        }).toVizNode();

      it('links an agent step to every ai-tool route sharing one of its tags with a dashed, labelled edge', async () => {
        const agentRoute = await getAgentRoute('support-assistant', { uri: 'openai', tags: 'support' });
        const lookupCustomer = await getToolRoute('lookupCustomer', 'support');
        const refundOrder = await getToolRoute('refundOrder', 'support');

        const { edges } = await FlowService.getTopologyFlowDiagram([agentRoute, lookupCustomer, refundOrder]);

        expect(edges).toEqual([
          expect.objectContaining({
            id: 'support-assistant >>> lookupCustomer (ai-tool)',
            type: 'topology-edge',
            source: 'support-assistant',
            target: 'lookupCustomer',
            edgeStyle: EdgeStyle.dashed,
            label: 'support',
          }),
          expect.objectContaining({
            id: 'support-assistant >>> refundOrder (ai-tool)',
            type: 'topology-edge',
            source: 'support-assistant',
            target: 'refundOrder',
            edgeStyle: EdgeStyle.dashed,
            label: 'support',
          }),
        ]);
      });

      it('draws a single edge labelled with every shared tag', async () => {
        const agentRoute = await getAgentRoute(
          'assistant',
          { uri: 'langchain4j-agent', tags: 'support, billing' },
          { uri: 'spring-ai-chat', tags: 'orders,support' },
        );
        const toolRoute = await getToolRoute('tool', 'orders,billing,support,other');

        const { edges } = await FlowService.getTopologyFlowDiagram([agentRoute, toolRoute]);

        expect(edges).toHaveLength(1);
        expect(edges[0]).toMatchObject({
          source: 'assistant',
          target: 'tool',
          edgeStyle: EdgeStyle.dashed,
          label: 'support, billing, orders',
        });
      });

      it('does not link routes without a shared tag', async () => {
        const agentRoute = await getAgentRoute('assistant', { uri: 'openai', tags: 'support' });
        const otherTool = await getToolRoute('other-tool', 'billing');
        const untaggedTool = await getToolRoute('untagged-tool');

        const { edges } = await FlowService.getTopologyFlowDiagram([agentRoute, otherTool, untaggedTool]);

        expect(edges).toEqual([]);
      });

      it('does not link tags given as property placeholders', async () => {
        const agentRoute = await getAgentRoute('assistant', { uri: 'openai', tags: '{{tools.tags}}' });
        const toolRoute = await getToolRoute('tool', '{{tools.tags}}');

        const { edges } = await FlowService.getTopologyFlowDiagram([agentRoute, toolRoute]);

        expect(edges).toEqual([]);
      });

      it('does not link an ai-tool route to its own agent step', async () => {
        const toolRoute = await new CamelRouteVisualEntity({
          route: {
            id: 'tool',
            from: {
              uri: 'ai-tool',
              parameters: { toolName: 'tool', tags: 'support' },
              steps: [{ to: { uri: 'openai', parameters: { tags: 'support' } } }],
            },
          },
        }).toVizNode();

        const { edges } = await FlowService.getTopologyFlowDiagram([toolRoute]);

        expect(edges).toEqual([]);
      });
    });
  });
});
