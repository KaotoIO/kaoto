import { Visualization } from '@patternfly/react-topology';

import { ControllerService } from '../components/Visualization/Canvas/controller.service';
import { FlowService } from '../components/Visualization/Canvas/flow.service';
import { KaotoResource } from '../models/kaoto-resource';
import { IVisualizationNode } from '../models/visualization/base-visual-entity';
import { getVisualizationNodesFromGraph } from '../utils/get-viznodes-from-graph';

interface RouteVisualizationController {
  /** A real topology controller, as created by the Canvas, holding the diagram of the first visual entity */
  controller: Visualization;
  /** The root visualization node of the first visual entity */
  rootVizNode: IVisualizationNode;
  /** Returns the visualization node of the diagram with the given path, e.g. `route.from.steps.0.set-header` */
  getVizNode: (path: string) => IVisualizationNode;
}

/**
 * Builds a real topology controller holding the diagram of the first visual entity of an (initialized) resource,
 * so components and hooks using `useVisualizationController()` can be rendered with real visualization nodes.
 */
export const createRouteVisualizationController = async (
  kaotoResource: KaotoResource,
): Promise<RouteVisualizationController> => {
  const visualEntity = kaotoResource.getVisualEntities()[0];
  const rootVizNode = await visualEntity.toVizNode();
  const { nodes, edges } = FlowService.getFlowDiagram('test', rootVizNode);

  const controller = ControllerService.createController();
  controller.fromModel({ nodes, edges, graph: { id: 'g1', type: 'graph' } });

  const vizNodes = getVisualizationNodesFromGraph(controller.getGraph());
  const getVizNode = (path: string): IVisualizationNode => {
    const vizNode = vizNodes.find((node) => node.data.path === path);
    if (!vizNode) {
      throw new Error(`No visualization node found for path: ${path}`);
    }

    return vizNode;
  };

  return { controller, rootVizNode, getVizNode };
};
