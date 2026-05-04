import { DagreGroupsLayout, GraphComponent, ModelKind, Visualization } from '@patternfly/react-topology';

import { LayoutType } from '../../components/Visualization/Canvas/canvas.models';
import { TopologyCollapsedGroup } from './components/TopologyCollapsedGroup';
import { TopologyDynamicEndpoint } from './components/TopologyDynamicEndpoint';
import { TopologyEdge } from './components/TopologyEdge';
import { TopologyExternalEndpoint } from './components/TopologyExternalEndpoint';
import { OrthogonalBendpointsEdge } from './OrthogonalBendpointsEdge';
import { DYNAMIC_ENDPOINT_NODE_TYPE, EXTERNAL_ENDPOINT_NODE_TYPE } from './topology-connections';
import { TopologyControllerService } from './topology-controller.service';

describe('TopologyControllerService', () => {
  describe('createController', () => {
    it('returns a Visualization with factories registered and a graph already in the model', () => {
      const controller = TopologyControllerService.createController();
      expect(controller).toBeInstanceOf(Visualization);
      // After fromModel({ graph }), getGraph() must succeed.
      expect(controller.getGraph().getId()).toBe('topology-graph');
    });
  });

  describe('layoutFactory', () => {
    // DagreGroupsLayout requires a real Graph (it calls graph.getController()), so we exercise
    // the factory through a real controller instead of building a mock graph from scratch.
    it('produces a DagreGroupsLayout for the horizontal layout type', () => {
      const controller = TopologyControllerService.createController();
      const layout = TopologyControllerService.layoutFactory(
        LayoutType.DagreHorizontal,
        controller.getGraph(),
      ) as DagreGroupsLayout;
      expect(layout).toBeInstanceOf(DagreGroupsLayout);
    });

    it('produces a DagreGroupsLayout for the vertical layout type', () => {
      const controller = TopologyControllerService.createController();
      const layout = TopologyControllerService.layoutFactory(
        LayoutType.DagreVertical,
        controller.getGraph(),
      ) as DagreGroupsLayout;
      expect(layout).toBeInstanceOf(DagreGroupsLayout);
    });
  });

  describe('componentFactory', () => {
    it('routes external-endpoint nodes to TopologyExternalEndpoint', () => {
      expect(TopologyControllerService.componentFactory(ModelKind.node, EXTERNAL_ENDPOINT_NODE_TYPE)).toBe(
        TopologyExternalEndpoint,
      );
    });

    it('routes dynamic-endpoint nodes to TopologyDynamicEndpoint', () => {
      expect(TopologyControllerService.componentFactory(ModelKind.node, DYNAMIC_ENDPOINT_NODE_TYPE)).toBe(
        TopologyDynamicEndpoint,
      );
    });

    it('routes group nodes to the context-menu-wrapped TopologyCollapsedGroup', () => {
      const Component = TopologyControllerService.componentFactory(ModelKind.node, 'group');
      expect(Component).toBeDefined();
      // The wrapped component is created by withContextMenu; it isn't === TopologyCollapsedGroup
      // but the displayName chain hints at the wrapped target.
      expect(Component).not.toBe(TopologyCollapsedGroup);
    });

    it('returns the default GraphComponent for the graph kind', () => {
      expect(TopologyControllerService.componentFactory(ModelKind.graph, 'graph')).toBe(GraphComponent);
    });

    it('routes generic edges to TopologyEdge', () => {
      expect(TopologyControllerService.componentFactory(ModelKind.edge, 'edge')).toBe(TopologyEdge);
    });

    it('returns undefined for unknown node types so PatternFly falls back to its default', () => {
      expect(TopologyControllerService.componentFactory(ModelKind.node, 'something-unknown')).toBeUndefined();
    });
  });

  describe('elementFactory', () => {
    it('returns an OrthogonalBendpointsEdge for the edge kind', () => {
      const element = TopologyControllerService.elementFactory(ModelKind.edge);
      expect(element).toBeInstanceOf(OrthogonalBendpointsEdge);
    });

    it('returns undefined for non-edge kinds (PatternFly uses its defaults)', () => {
      expect(TopologyControllerService.elementFactory(ModelKind.node)).toBeUndefined();
      expect(TopologyControllerService.elementFactory(ModelKind.graph)).toBeUndefined();
    });
  });
});
