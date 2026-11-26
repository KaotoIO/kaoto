import { RouteDefinition } from '@kaoto/camel-catalog/types';
import { EdgeStyle, Visualization } from '@patternfly/react-topology';

import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../models/visualization/flows/camel-route-visual-entity';
import { ControllerService } from './Canvas/controller.service';
import { applyAiToolEdges, buildDesignerCanvasModel, getAiToolEdges, getAiToolEdgesKey } from './designer-canvas-model';
import { getRouteSteps } from './Topology/topology-endpoints';

const toolRoute = (id: string, tags?: string): RouteDefinition => ({
  id,
  from: {
    uri: 'ai-tool',
    parameters: { toolName: id, ...(tags === undefined ? {} : { tags }) },
    steps: [{ log: { message: id } }],
  },
});

const routes: RouteDefinition[] = [
  {
    id: 'agent',
    from: {
      uri: 'direct:agent',
      steps: [
        { to: { uri: 'openai', parameters: { operation: 'chat-completion', tags: 'support,billing' } } },
        {
          choice: {
            when: [
              {
                simple: { expression: '${header.billing}' },
                steps: [{ to: { uri: 'spring-ai-chat', parameters: { chatId: 'billing', tags: 'billing' } } }],
              },
            ],
          },
        },
      ],
    },
  },
  { id: 'query-agent', from: { uri: 'direct:query', steps: [{ toD: { uri: 'langchain4j-agent:a?tags=other' } }] } },
  {
    id: 'self',
    from: {
      uri: 'ai-tool',
      parameters: { toolName: 'self', tags: 'self' },
      steps: [{ to: { uri: 'openai', parameters: { tags: 'self' } } }],
    },
  },
  toolRoute('tool-support', 'support'),
  toolRoute('tool-billing', 'billing'),
  toolRoute('tool-other', 'other'),
  toolRoute('tool-untagged'),
];

describe('designer-canvas-model', () => {
  let vizNodes: IVisualizationNode[];

  beforeEach(async () => {
    vizNodes = await Promise.all(routes.map((route) => new CamelRouteVisualEntity({ route }).toVizNode()));
  });

  /** The canvas id of a route, and of the steps of a route whose uri starts with a component */
  const routeId = (id: string) => `${id}|${vizNodes.find((vizNode) => vizNode.getId() === id)!.id}`;
  const stepIds = (id: string, component: string) => {
    const route = vizNodes.find((vizNode) => vizNode.getId() === id)!;
    return getRouteSteps(route)
      .filter((step) => (step.data.definition as { uri?: string }).uri?.startsWith(component))
      .map((step) => `${id}|${step.id}`);
  };

  it('should link an agent route to each tool route that shares a tag, dashed and labelled with the shared tags', () => {
    const edge = getAiToolEdges(vizNodes).find((e) => e.target === routeId('tool-support'));

    expect(edge).toEqual({
      id: `${routeId('agent')} >>> ${routeId('tool-support')} (ai-tool)`,
      type: 'topology-edge',
      source: routeId('agent'),
      target: routeId('tool-support'),
      edgeStyle: EdgeStyle.dashed,
      label: 'support',
      data: { sourceSteps: stepIds('agent', 'openai') },
    });
  });

  it('should merge the agent steps of a route that share a tag with a tool in one link', () => {
    const edge = getAiToolEdges(vizNodes).find((e) => e.target === routeId('tool-billing'));

    expect(edge?.label).toBe('billing');
    expect(edge?.data.sourceSteps).toEqual([...stepIds('agent', 'openai'), ...stepIds('agent', 'spring-ai-chat')]);
  });

  it('should read the tags from the query of the uri', () => {
    const edge = getAiToolEdges(vizNodes).find((e) => e.target === routeId('tool-other'));

    expect(edge?.source).toBe(routeId('query-agent'));
    expect(edge?.label).toBe('other');
  });

  it('should not link a route to itself, nor to a tool without tags', () => {
    const edges = getAiToolEdges(vizNodes);

    expect(edges.map((edge) => [edge.source, edge.target])).toEqual([
      [routeId('agent'), routeId('tool-support')],
      [routeId('agent'), routeId('tool-billing')],
      [routeId('query-agent'), routeId('tool-other')],
    ]);
  });

  it('should add the links to the nodes and edges of the routes', () => {
    const model = buildDesignerCanvasModel(vizNodes);

    expect(model.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(routes.map((r) => routeId(r.id!))));
    expect(model.edges.filter((edge) => edge.type === 'topology-edge')).toHaveLength(3);
  });

  it('should change its key when the tags of an agent step change', () => {
    const key = getAiToolEdgesKey(vizNodes);
    const openai = getRouteSteps(vizNodes[0]).find((step) => step.data.path === 'route.from.steps.0.to')!;
    (openai.data.definition as { parameters: { tags: string } }).parameters.tags = 'other';

    expect(getAiToolEdgesKey(vizNodes)).not.toEqual(key);
  });

  describe('applyAiToolEdges', () => {
    it('should replace the links to the tools drawn by the controller and keep the other edges', () => {
      const controller: Visualization = ControllerService.createController();
      controller.fromModel({
        graph: { id: 'g1', type: 'graph' },
        nodes: ['agent', 'tool-a', 'tool-b'].map((id) => ({ id, type: 'node', width: 10, height: 10 })),
        edges: [
          { id: 'step-edge', type: 'edge', source: 'agent', target: 'tool-a' },
          { id: 'old-link', type: 'topology-edge', source: 'agent', target: 'tool-a', label: 'old' },
        ],
      });
      const layoutSpy = vi.spyOn(controller.getGraph(), 'layout');

      applyAiToolEdges(controller, [
        { id: 'new-link', type: 'topology-edge', source: 'agent', target: 'tool-b', label: 'new' },
      ]);

      expect(controller.getEdgeById('old-link')).toBeUndefined();
      expect(controller.getEdgeById('new-link')?.getLabel()).toBe('new');
      expect(controller.getEdgeById('step-edge')).toBeDefined();
      expect(layoutSpy).toHaveBeenCalled();
    });
  });
});
