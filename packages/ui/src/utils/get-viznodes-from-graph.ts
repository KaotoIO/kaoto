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

import type { Graph, GraphElement } from '@patternfly/react-topology';

import { CanvasNode } from '../components/Visualization/Canvas/canvas.models';
import { IVisualizationNode } from '../models/visualization/base-visual-entity';
import { isDefined } from './is-defined';

const getVisualizationNodeFromCanvasNode = (
  node: GraphElement<CanvasNode, CanvasNode['data']>,
  predicate: (vizNode: IVisualizationNode) => boolean,
  accumulator: IVisualizationNode[],
): IVisualizationNode[] => {
  const vizNode = node.getData()?.vizNode;
  if (isDefined(vizNode) && predicate(vizNode)) {
    accumulator.push(vizNode);
  }

  node.getChildren().forEach((child) => {
    getVisualizationNodeFromCanvasNode(child, predicate, accumulator);
  });

  return accumulator;
};

export const getVisualizationNodesFromGraph = (
  graph: Graph,
  predicate: (vizNode: IVisualizationNode) => boolean = () => true,
): IVisualizationNode[] => {
  const vizNodes: IVisualizationNode[] = [];

  graph.getNodes().forEach((node) => {
    getVisualizationNodeFromCanvasNode(node, predicate, vizNodes);
  });

  return vizNodes;
};
