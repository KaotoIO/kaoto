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
  withContextMenu,
} from '@patternfly/react-topology';

import { LayoutType } from '../../components/Visualization/Canvas/canvas.models';
import { TopologyCollapsedGroup } from './components/TopologyCollapsedGroup';
import { TopologyDynamicEndpoint } from './components/TopologyDynamicEndpoint';
import { TopologyEdge } from './components/TopologyEdge';
import { TopologyExternalEndpoint } from './components/TopologyExternalEndpoint';
import { OrthogonalBendpointsEdge } from './OrthogonalBendpointsEdge';
import { DYNAMIC_ENDPOINT_NODE_TYPE, EXTERNAL_ENDPOINT_NODE_TYPE } from './topology-connections';
import { topologyContextMenuFn } from './topology-context-menu';

const TopologyCollapsedGroupWithMenu = withContextMenu(topologyContextMenuFn)(TopologyCollapsedGroup);

export class TopologyControllerService {
  static createController(): Visualization {
    const controller = new Visualization();

    controller.registerLayoutFactory(this.layoutFactory);
    controller.registerComponentFactory(this.componentFactory);
    controller.registerElementFactory(this.elementFactory);
    controller.fromModel({
      graph: {
        id: 'topology-graph',
        type: 'graph',
      },
    });

    return controller;
  }

  static layoutFactory(type: string, graph: Graph): Layout | undefined {
    const isHorizontal = type === LayoutType.DagreHorizontal;
    return new DagreGroupsLayout(graph, {
      rankdir: isHorizontal ? LEFT_TO_RIGHT : TOP_TO_BOTTOM,
      nodeDistance: 60,
      ranker: 'network-simplex',
      nodesep: 30,
      edgesep: 20,
      ranksep: 60,
    });
  }

  static componentFactory(kind: ModelKind, type: string): ReturnType<ComponentFactory> {
    // Intentional "type before kind" precedence: external/dynamic endpoint nodes and the
    // collapsed-route group must resolve to their dedicated renderers regardless of their
    // ModelKind. Generic ModelKind.graph / ModelKind.edge handling lives in the switch
    // below — don't reorder these checks.
    if (type === EXTERNAL_ENDPOINT_NODE_TYPE) {
      return TopologyExternalEndpoint;
    }
    if (type === DYNAMIC_ENDPOINT_NODE_TYPE) {
      return TopologyDynamicEndpoint;
    }
    if (type === 'group') {
      return TopologyCollapsedGroupWithMenu;
    }
    switch (kind) {
      case ModelKind.graph:
        return GraphComponent;
      case ModelKind.edge:
        return TopologyEdge;
      default:
        return undefined;
    }
  }

  static elementFactory(kind: ModelKind): GraphElement | undefined {
    if (kind === ModelKind.edge) {
      return new OrthogonalBendpointsEdge();
    }
    return undefined;
  }
}
