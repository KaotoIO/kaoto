import {
  ComponentFactory,
  DagreGroupsLayout,
  Graph,
  GraphComponent,
  GraphElement,
  Layout,
  LEFT_TO_RIGHT,
  ModelKind,
  TOP_TO_BOTTOM,
  Visualization,
  withPanZoom,
} from '@patternfly/react-topology';
import { CustomGroupWithSelection, CustomNodeWithSelection, NoBendpointsEdge } from '../Custom';
import { PlaceholderNode } from '../Custom/Node/PlaceholderNode';
import { LayoutType } from './canvas.models';
import { CustomEdge } from '../Custom/Edge/CustomEdge';

export class ControllerService {
  static createController(): Visualization {
    const newController = new Visualization();

    newController.registerLayoutFactory(this.baselineLayoutFactory);
    newController.registerComponentFactory(this.baselineComponentFactory);
    newController.registerElementFactory(this.baselineElementFactory);
    newController.fromModel({
      graph: {
        id: 'g1',
        type: 'graph',
      },
    });

    return newController;
  }

  static baselineLayoutFactory(type: string, graph: Graph): Layout | undefined {
    const isHorizontal = type === LayoutType.DagreHorizontal;

    return new DagreGroupsLayout(graph, {
      rankdir: isHorizontal ? LEFT_TO_RIGHT : TOP_TO_BOTTOM,
      nodeDistance: isHorizontal ? 30 : 40,
      ranker: 'network-simplex',
      nodesep: 10,
      edgesep: 10,
      ranksep: 0,
    });
  }

  static baselineComponentFactory(kind: ModelKind, type: string): ReturnType<ComponentFactory> {
    switch (type) {
      case 'group':
        return CustomGroupWithSelection;
      case 'node-placeholder':
        return PlaceholderNode;
      default:
        switch (kind) {
          case ModelKind.graph:
            return withPanZoom()(GraphComponent);
          case ModelKind.node:
            return CustomNodeWithSelection;
          case ModelKind.edge:
            return CustomEdge;
          default:
            return undefined;
        }
    }
  }

  static baselineElementFactory(kind: ModelKind): GraphElement | undefined {
    switch (kind) {
      case ModelKind.edge:
        return new NoBendpointsEdge();
      default:
        return undefined;
    }
  }
}
