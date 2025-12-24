/*
 * Copyright (C) 2024 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Graph, Model } from '@patternfly/react-topology';

import { ControllerService } from '../components/Visualization/Canvas/controller.service';
import { FlowService } from '../components/Visualization/Canvas/flow.service';
import { CamelRouteVisualEntity, IVisualizationNode } from '../models';
import { camelRouteWithDisabledSteps } from '../stubs';
import { getVisualizationNodesFromGraph } from './get-viznodes-from-graph';

describe('getVisualizationNodesFromGraph', () => {
  it('should return an empty array if there are no nodes in the graph', () => {
    const graph = {
      getNodes: jest.fn().mockReturnValue([]),
    } as unknown as Graph;

    const result = getVisualizationNodesFromGraph(graph);

    expect(result).toEqual([]);
  });

  it('should return all visualization nodes from the graph', () => {
    const visualEntity = new CamelRouteVisualEntity(camelRouteWithDisabledSteps);
    const { nodes, edges } = FlowService.getFlowDiagram('test', visualEntity.toVizNode());

    const model: Model = {
      nodes,
      edges,
      graph: {
        id: 'g1',
        type: 'graph',
      },
    };
    const visualizationController = ControllerService.createController();
    visualizationController.fromModel(model);

    const vizNodes = getVisualizationNodesFromGraph(visualizationController.getGraph());

    expect(vizNodes).toHaveLength(5);
    expect(vizNodes[0].getNodeLabel()).toEqual('route-8888');
    expect(vizNodes[1].getNodeLabel()).toEqual('timer');
    expect(vizNodes[2].getNodeLabel()).toEqual('log');
    expect(vizNodes[3].getNodeLabel()).toEqual('direct');
    expect(vizNodes[4].data.isPlaceholder).toBe(true);
  });

  it('should return all visualization nodes matching the predicate', () => {
    const visualEntity = new CamelRouteVisualEntity(camelRouteWithDisabledSteps);
    const { nodes, edges } = FlowService.getFlowDiagram('test', visualEntity.toVizNode());

    const model: Model = {
      nodes,
      edges,
      graph: {
        id: 'g1',
        type: 'graph',
      },
    };
    const visualizationController = ControllerService.createController();
    visualizationController.fromModel(model);

    const predicate = (vizNode: IVisualizationNode) => vizNode.getNodeLabel() !== 'timer';
    const vizNodes = getVisualizationNodesFromGraph(visualizationController.getGraph(), predicate);

    expect(vizNodes).toHaveLength(4);
    expect(vizNodes[0].getNodeLabel()).toEqual('route-8888');
    expect(vizNodes[1].getNodeLabel()).toEqual('log');
    expect(vizNodes[2].getNodeLabel()).toEqual('direct');
    expect(vizNodes[3].data.isPlaceholder).toBe(true);
  });

  it('should return all visualization nodes matching a complex predicate', () => {
    const visualEntity = new CamelRouteVisualEntity(camelRouteWithDisabledSteps);
    const { nodes, edges } = FlowService.getFlowDiagram('test', visualEntity.toVizNode());

    const model: Model = {
      nodes,
      edges,
      graph: {
        id: 'g1',
        type: 'graph',
      },
    };
    const visualizationController = ControllerService.createController();
    visualizationController.fromModel(model);

    const predicate = (vizNode: IVisualizationNode) => {
      return vizNode.getNodeDefinition()?.disabled;
    };
    const vizNodes = getVisualizationNodesFromGraph(visualizationController.getGraph(), predicate);

    expect(vizNodes).toHaveLength(2);
    expect(vizNodes[0].getNodeLabel()).toEqual('log');
    expect(vizNodes[1].getNodeLabel()).toEqual('direct');
  });
});
