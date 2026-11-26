import { Controller, EdgeStyle } from '@patternfly/react-topology';
import { action } from 'mobx';

import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { CanvasEdge, CanvasNode, CanvasNodesAndEdges } from './Canvas/canvas.models';
import { FlowService } from './Canvas/flow.service';
import { AI_TOOL_EDGE_TYPE } from './Custom/route-link-anchor';
import { getAiToolEdgeId, getAiToolStep, getRouteSteps } from './Topology/topology-endpoints';

/** The data of a link from an agent route to a tool route: the ids of the agent steps it starts from */
export interface AgentLinkData {
  sourceSteps: string[];
}

interface AiToolRouteStep {
  routeId: string;
  stepId: string;
  tags: string[];
}

/**
 * Links each route with `AI_TOOL_PRODUCER_COMPONENTS` steps to every other `ai-tool` route that shares one of their
 * tags, as the Topology view does, labelled with the shared tags.
 * The layout places the routes one nesting level at a time and leaves out the edges between the steps of two routes,
 * so the link goes from route to route, and keeps the agent steps it starts from to draw them inside the route.
 */
export const getAiToolEdges = (vizNodes: IVisualizationNode[]): CanvasEdge[] => {
  const agents: AiToolRouteStep[] = [];
  const tools: AiToolRouteStep[] = [];

  vizNodes.forEach((routeVizNode) => {
    const scope = routeVizNode.getId() ?? routeVizNode.id;
    getRouteSteps(routeVizNode).forEach((step) => {
      const aiToolStep = getAiToolStep(step);
      if (!aiToolStep || aiToolStep.tags.length === 0) return;

      const routeStep = {
        routeId: `${scope}|${routeVizNode.id}`,
        stepId: `${scope}|${step.id}`,
        tags: aiToolStep.tags,
      };
      (aiToolStep.role === 'tool' ? tools : agents).push(routeStep);
    });
  });

  const edges = new Map<string, CanvasEdge & { data: AgentLinkData }>();
  agents.forEach((agent) => {
    tools.forEach((tool) => {
      const sharedTags = agent.tags.filter((tag) => tool.tags.includes(tag));
      if (tool.routeId === agent.routeId || sharedTags.length === 0) return;

      const id = getAiToolEdgeId(agent.routeId, tool.routeId);
      const existing = edges.get(id);
      const tags = new Set([...(existing?.label?.split(', ') ?? []), ...sharedTags]);
      edges.set(id, {
        id,
        type: AI_TOOL_EDGE_TYPE,
        source: agent.routeId,
        target: tool.routeId,
        edgeStyle: EdgeStyle.dashed,
        label: [...tags].join(', '),
        data: { sourceSteps: [...new Set([...(existing?.data.sourceSteps ?? []), agent.stepId])] },
      });
    });
  });

  return [...edges.values()];
};

/**
 * Replaces the links from the agent routes to the tool routes drawn by the controller, and lays the graph out again,
 * without drawing the rest of the model again: the selected step, and the side panel that edits it, stay as they are.
 */
export const applyAiToolEdges = action((controller: Controller, aiToolEdges: CanvasEdge[]): void => {
  const model = controller.toModel();
  const edges = (model.edges ?? []).filter((edge) => edge.type !== AI_TOOL_EDGE_TYPE);
  controller.fromModel({ ...model, edges: [...edges, ...aiToolEdges] }, true);
  controller.getGraph().layout();
});

/** A key that changes when the links from the agent routes to the tool routes change */
export const getAiToolEdgesKey = (vizNodes: IVisualizationNode[]): string =>
  JSON.stringify(getAiToolEdges(vizNodes).map(({ id, label, data }) => [id, label, data.sourceSteps]));

export function buildDesignerCanvasModel(
  vizNodes: IVisualizationNode[],
  options: { removePlaceholder?: boolean } = {},
): CanvasNodesAndEdges {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];

  vizNodes.forEach((vizNode) => {
    const { nodes: childNodes, edges: childEdges } = FlowService.getFlowDiagram(
      vizNode.getId() ?? vizNode.id,
      vizNode,
      options,
    );
    nodes.push(...childNodes);
    edges.push(...childEdges);
  });

  edges.push(...getAiToolEdges(vizNodes));

  return { nodes, edges };
}
