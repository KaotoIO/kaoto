import { EdgeStyle } from '@patternfly/react-topology';

import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { collectTopologyEndpoints, getAiToolEdgeId, getAiToolTagFromKey } from '../Topology/topology-endpoints';
import { CanvasDefaults } from './canvas.defaults';
import { CanvasEdge, CanvasNode, CanvasNodeData, CanvasNodesAndEdges } from './canvas.models';

export class FlowService {
  static nodes: CanvasNode[] = []; // NOSONAR typescript:S1444 - intentionally reassigned on each diagram rebuild
  static edges: CanvasEdge[] = []; // NOSONAR typescript:S1444 - intentionally reassigned on each diagram rebuild
  private static visitedNodes: string[] = [];

  static getFlowDiagram(
    scope: string,
    vizNode: IVisualizationNode,
    options: { removePlaceholder?: boolean } = {},
  ): CanvasNodesAndEdges {
    this.nodes = [];
    this.edges = [];
    this.visitedNodes = [];

    this.appendNodesAndEdges(vizNode, options);

    this.nodes.forEach((node) => {
      node.id = `${scope}|${node.id}`;
      node.children = node.children?.map((child) => `${scope}|${child}`);
      node.parentNode = node.parentNode ? `${scope}|${node.parentNode}` : undefined;
    });
    this.edges.forEach((edge) => {
      edge.id = `${scope}|${edge.id}`;
      edge.source = `${scope}|${edge.source}`;
      edge.target = `${scope}|${edge.target}`;
    });

    return { nodes: this.nodes, edges: this.edges };
  }

  /** Method for iterating over all the IVisualizationNode and its children using a depth-first algorithm */
  private static appendNodesAndEdges(
    vizNodeParam: IVisualizationNode,
    options: { removePlaceholder?: boolean } = {},
  ): void {
    const removePlaceholder = options.removePlaceholder ?? false;
    if (this.visitedNodes.includes(vizNodeParam.id) || (removePlaceholder && vizNodeParam.data.isPlaceholder)) {
      return;
    }
    let node: CanvasNode;

    let children = vizNodeParam.getChildren() ?? [];
    if (removePlaceholder) {
      children = children.filter((child) => !child.data.isPlaceholder);
    }
    const hasRealChildren = children.length > 0;

    if (vizNodeParam.data.isGroup && hasRealChildren) {
      children.forEach((child) => {
        this.appendNodesAndEdges(child, options);
      });

      node = this.getGroup(vizNodeParam.id, {
        label: vizNodeParam.id,
        children: children.map((c) => c.id),
        parentNode: vizNodeParam.getParentNode()?.id,
        data: { vizNode: vizNodeParam },
      });
    } else {
      vizNodeParam.data.isGroup = false;
      node = this.getCanvasNode(vizNodeParam);
      node.group = false;
      node.children = [];
    }

    /** Add node */
    this.nodes.push(node);
    this.visitedNodes.push(node.id);

    /** Add edges */
    this.edges.push(...this.getEdgesFromVizNode(vizNodeParam, options));
  }

  static async getTopologyFlowDiagram(vizNodes: IVisualizationNode[]): Promise<CanvasNodesAndEdges> {
    this.nodes = vizNodes.map((vizNode) => this.getTopologyNode(vizNode));
    this.edges = [];

    const routeNodeIds = new Set(this.nodes.map((node) => node.id));
    const { consumersByEndpoint, outgoingByEntity } = await collectTopologyEndpoints(vizNodes);
    /** The `ai-tool` edges, one per agent route and tool route, with the tags they share */
    const aiToolEdges = new Map<string, CanvasEdge>();

    outgoingByEntity.forEach((endpoints, producerId) => {
      if (!routeNodeIds.has(producerId)) {
        return;
      }
      endpoints.forEach((endpoint) => {
        const consumerIds = consumersByEndpoint.get(endpoint);
        const aiToolTag = getAiToolTagFromKey(endpoint);

        // The endpoint is consumed somewhere in this file (possibly only by the producer itself).
        // Don't treat it as external; emit edges to any non-self consumer.
        if (consumerIds && consumerIds.length > 0) {
          consumerIds.forEach((consumerId) => {
            if (consumerId === producerId || !routeNodeIds.has(consumerId)) {
              return;
            }
            if (aiToolTag === undefined) {
              this.edges.push(this.getTopologyEdge(producerId, consumerId));
            } else {
              this.addAiToolTag(aiToolEdges, producerId, consumerId, aiToolTag);
            }
          });
        }
      });
    });

    return { nodes: this.nodes, edges: this.edges };
  }

  /**
   * Adds a tag to the edge from an agent route to an `ai-tool` route, creating the edge for their first shared tag.
   * The model decides at run time which of the tools it calls, so the edge is dashed.
   */
  private static addAiToolTag(edges: Map<string, CanvasEdge>, source: string, target: string, tag: string): void {
    const id = getAiToolEdgeId(source, target);
    const existingEdge = edges.get(id);
    if (existingEdge) {
      existingEdge.label = `${existingEdge.label}, ${tag}`;
      return;
    }

    const edge = this.getTopologyEdge(source, target);
    edge.id = id;
    edge.edgeStyle = EdgeStyle.dashed;
    edge.label = tag;
    edges.set(edge.id, edge);
    this.edges.push(edge);
  }

  private static getCanvasNode(vizNodeParam: IVisualizationNode): CanvasNode {
    /** Join the parent if exist to form a group */
    const parentNode =
      vizNodeParam.getParentNode()?.getChildren() === undefined ? undefined : vizNodeParam.getParentNode()?.id;

    const canvasNode = this.getNode(vizNodeParam.id, {
      parentNode,
      data: { vizNode: vizNodeParam },
    });

    if (vizNodeParam.data.isPlaceholder) {
      canvasNode.type = 'node-placeholder';
      canvasNode.width = CanvasDefaults.DEFAULT_PLACEHOLDER_NODE_WIDTH;
      canvasNode.height = CanvasDefaults.DEFAULT_PLACEHOLDER_NODE_HEIGHT;
    }

    return canvasNode;
  }

  private static getEdgesFromVizNode(
    vizNodeParam: IVisualizationNode,
    options: { removePlaceholder?: boolean } = {},
  ): CanvasEdge[] {
    const edges: CanvasEdge[] = [];
    const prev = vizNodeParam.getPreviousNode?.();
    const next = vizNodeParam.getNextNode?.();

    const removePlaceholder = options.removePlaceholder ?? false;
    if (removePlaceholder && next?.data.isPlaceholder) {
      return edges;
    }

    const isGroup = vizNodeParam.data?.isGroup === true;
    const hasChildren = (vizNodeParam.getChildren() ?? []).length > 0;

    /**
     *  Priority Rule 1: Normal flow
     */
    if (next) {
      edges.push(this.getEdge(vizNodeParam.id, next.id));
    } else if (isGroup && !hasChildren && prev) {
      /**
       *  Priority Rule 2 (Fallback):
       * If node was a group like "choice" → now empty → keep it after its previous sibling
       */
      edges.push(this.getEdge(prev.id, vizNodeParam.id));
    }

    return edges;
  }

  private static getGroup(
    id: string,
    options: { label?: string; children?: string[]; parentNode?: string; data?: CanvasNodeData } = {},
  ): CanvasNode {
    return {
      id,
      type: 'group',
      group: true,
      label: options.label ?? id,
      children: options.children ?? [],
      parentNode: options.parentNode,
      data: options.data,
      style: {
        padding: CanvasDefaults.DEFAULT_GROUP_PADDING,
      },
    };
  }

  private static getNode(id: string, options: { parentNode?: string; data?: CanvasNodeData } = {}): CanvasNode {
    return {
      id,
      type: 'node',
      parentNode: options.parentNode,
      data: options.data,
      width: CanvasDefaults.DEFAULT_NODE_WIDTH,
      height: CanvasDefaults.DEFAULT_NODE_HEIGHT,
      shape: CanvasDefaults.DEFAULT_NODE_SHAPE,
    };
  }

  private static getTopologyNode(vizNodeParam: IVisualizationNode): CanvasNode {
    const node = this.getNode(vizNodeParam.getId() ?? vizNodeParam.id, { data: { vizNode: vizNodeParam } });
    node.type = 'topology-node';
    return node;
  }

  private static getTopologyEdge(source: string, target: string): CanvasEdge {
    const edge = this.getEdge(source, target);
    edge.type = 'topology-edge';
    return edge;
  }

  private static getEdge(source: string, target: string): CanvasEdge {
    return {
      id: `${source} >>> ${target}`,
      type: 'edge',
      source,
      target,
      edgeStyle: EdgeStyle.solid,
    };
  }
}
