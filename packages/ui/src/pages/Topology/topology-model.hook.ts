import { Model } from '@patternfly/react-topology';
import { useMemo } from 'react';

import { CanvasEdge, CanvasNode, LayoutType } from '../../components/Visualization/Canvas/canvas.models';
import { FlowService } from '../../components/Visualization/Canvas/flow.service';
import { BaseVisualEntity, IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { buildRouteConnectionExtras } from './topology-connections';

export interface TopologyModelResult {
  /** PatternFly Topology model: nodes (route groups + synthetic endpoints) + edges. */
  model: Model;
  /** IDs of every top-level group (one per route); used to mark them as collapsed. */
  topLevelGroupIds: string[];
}

/**
 * Build the topology model from the resolved viz nodes and the underlying
 * visual entities. Combines:
 *   - the per-route flow diagrams produced by FlowService (used as collapsed groups)
 *   - cross-route edges from in-VM endpoint references
 *   - synthetic external/dynamic endpoint nodes for unresolved producers
 */
export const useTopologyModel = (
  vizNodes: IVisualizationNode[],
  visualEntities: BaseVisualEntity[],
  activeLayout: LayoutType,
): TopologyModelResult =>
  useMemo(() => {
    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];
    const topLevelGroupIds: string[] = [];
    const entityToTopLevelId = new Map<string, string>();

    vizNodes.forEach((vizNode) => {
      const scope = vizNode.getId() ?? vizNode.id;
      const { nodes: childNodes, edges: childEdges } = FlowService.getFlowDiagram(scope, vizNode, {
        removePlaceholder: true,
      });
      nodes.push(...childNodes);
      edges.push(...childEdges);

      const topLevel = childNodes.find((node) => node.type === 'group' && !node.parentNode);
      if (topLevel) {
        topLevelGroupIds.push(topLevel.id);
        entityToTopLevelId.set(scope, topLevel.id);
      }
    });

    // Use the same icon URL as the route nodes so external/dynamic endpoints look consistent.
    const routeIconUrl = (vizNodes[0]?.data.iconUrl as string | undefined) ?? '';
    const {
      edges: connectionEdges,
      externalNodes,
      dynamicNodes,
    } = buildRouteConnectionExtras(visualEntities, entityToTopLevelId, routeIconUrl);
    // Insert synthetic endpoint nodes before route children so PatternFly Topology lays them out
    // without colliding with collapsed groups.
    nodes.unshift(...externalNodes, ...dynamicNodes);
    edges.push(...connectionEdges);

    return {
      model: {
        nodes,
        edges,
        graph: {
          id: 'topology-graph',
          type: 'graph',
          layout: activeLayout,
        },
      } satisfies Model,
      topLevelGroupIds,
    };
  }, [vizNodes, visualEntities, activeLayout]);
