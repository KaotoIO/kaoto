import { AnchorEnd, Point, Visualization } from '@patternfly/react-topology';
import { render } from '@testing-library/react';
import { createElement, FunctionComponent } from 'react';

import { buildFakeCanvas } from '../../../stubs/route-link-nodes';
import { TopologyElementWrapper } from '../../../stubs/topology-element-wrapper';
import { LayoutType } from '../Canvas/canvas.models';
import { ControllerService } from '../Canvas/controller.service';
import {
  AI_TOOL_EDGE_TYPE,
  getRouteLinkExit,
  getRouteLinkStart,
  ROUTE_LINK_BUS_INSET,
  useRouteLinkAnchors,
} from './route-link-anchor';

describe('route-link-anchor', () => {
  describe('getRouteLinkExit', () => {
    it('should leave a route on its right, inside its bottom, in a horizontal layout', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        { id: 'route', bounds: [0, 0, 400, 200], children: [] },
      ]);

      expect(getRouteLinkExit(getNode('route'))).toEqual(new Point(400, 190));
    });

    it('should leave a route at its bottom, past the names of its steps, in a vertical layout', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreVertical, [
        { id: 'route', bounds: [0, 0, 400, 200], children: [] },
      ]);

      expect(getRouteLinkExit(getNode('route'))).toEqual(new Point(400 - ROUTE_LINK_BUS_INSET.vertical, 200));
    });

    it('should leave a collapsed route on its right in a horizontal layout', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        { id: 'route', bounds: [0, 0, 90, 75], children: [], collapsed: true },
      ]);

      expect(getRouteLinkExit(getNode('route'))).toEqual(new Point(90, 37.5));
    });

    it('should leave a collapsed route under its name in a vertical layout', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreVertical, [
        { id: 'route', bounds: [0, 0, 90, 75], children: [], collapsed: true },
      ]);

      expect(getRouteLinkExit(getNode('route'))).toEqual(new Point(45, 99));
    });
  });

  describe('getRouteLinkStart', () => {
    it('should start the link where it leaves a route alone in its rank', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        { id: 'agent', bounds: [0, 0, 400, 200], children: [], sourceSteps: ['step'] },
        { id: 'tool', bounds: [600, 0, 300, 100], children: [] },
      ]);

      expect(getRouteLinkStart(getNode('agent'))).toEqual(new Point(400, 190));
    });

    it('should start the links past the widest route of the rank, apart from each other, in a horizontal layout', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        { id: 'narrow-agent', bounds: [100, 0, 300, 100], children: [], sourceSteps: ['step-1'] },
        { id: 'wide-agent', bounds: [0, 200, 500, 100], children: [], sourceSteps: ['step-2'] },
        { id: 'other', bounds: [50, 400, 450, 100], children: [] },
        { id: 'tool', bounds: [700, 0, 300, 100], children: [] },
      ]);

      expect(getRouteLinkStart(getNode('narrow-agent'))).toEqual(new Point(500, 90));
      expect(getRouteLinkStart(getNode('wide-agent'))).toEqual(new Point(508, 290));
    });

    it('should start the links below the tallest route of the rank, apart from each other, in a vertical layout', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreVertical, [
        { id: 'short-agent', bounds: [0, 100, 100, 300], children: [], sourceSteps: ['step-1'] },
        { id: 'tall-agent', bounds: [200, 0, 100, 500], children: [], sourceSteps: ['step-2'] },
        { id: 'tool', bounds: [0, 700, 100, 300], children: [] },
      ]);

      expect(getRouteLinkStart(getNode('short-agent'))).toEqual(new Point(95, 500));
      expect(getRouteLinkStart(getNode('tall-agent'))).toEqual(new Point(295, 508));
    });

    it('should keep the links of many agent routes within the room before the next rank', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        { id: 'agent-1', bounds: [0, 0, 400, 100], children: [], sourceSteps: ['step-1'] },
        { id: 'agent-2', bounds: [0, 200, 400, 100], children: [], sourceSteps: ['step-2'] },
        { id: 'agent-3', bounds: [0, 400, 400, 100], children: [], sourceSteps: ['step-3'] },
        { id: 'tool', bounds: [450, 0, 300, 100], children: [] },
      ]);

      /* 50 between the ranks, 40 of them kept for the bends and arrows: 10 for two steps */
      expect(getRouteLinkStart(getNode('agent-2')).x).toBe(405);
      expect(getRouteLinkStart(getNode('agent-3')).x).toBe(410);
    });
  });

  describe('getRouteLinkStart with collapsed routes and tags', () => {
    it('should bend past the name of a collapsed route of the rank', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        { id: 'agent', bounds: [0, 0, 90, 75], children: [], collapsed: true, sourceSteps: ['step'] },
        { id: 'tool', bounds: [400, 0, 300, 100], children: [] },
      ]);

      /* The name is 150 wide, centered under the route */
      expect(getRouteLinkStart(getNode('agent')).x).toBe(120);
    });

    it('should keep the links of the agent routes out of the room of the tags', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        { id: 'agent-1', bounds: [0, 0, 400, 100], children: [], sourceSteps: ['step-1'], linkLabels: ['support'] },
        { id: 'agent-2', bounds: [0, 200, 400, 100], children: [], sourceSteps: ['step-2'] },
        { id: 'tool', bounds: [540, 0, 300, 100], children: [] },
      ]);

      /* 140 between the ranks, 40 for the bends and arrows, 85 for the tag: 15 left, more than one step */
      expect(getRouteLinkStart(getNode('agent-2')).x).toBe(408);
    });

    it('should bring the links of the agent routes together when the tags take all the room', () => {
      const { getNode } = buildFakeCanvas(LayoutType.DagreHorizontal, [
        {
          id: 'agent-1',
          bounds: [0, 0, 400, 100],
          children: [],
          sourceSteps: ['step-1'],
          linkLabels: ['customer-support'],
        },
        { id: 'agent-2', bounds: [0, 200, 400, 100], children: [], sourceSteps: ['step-2'] },
        { id: 'tool', bounds: [500, 0, 300, 100], children: [] },
      ]);

      expect(getRouteLinkStart(getNode('agent-2')).x).toBe(400);
    });
  });

  describe('useRouteLinkAnchors', () => {
    const RouteLinkAnchors: FunctionComponent = () => {
      useRouteLinkAnchors();
      return null;
    };

    const renderAnchors = (layout: LayoutType) => {
      const controller = new Visualization();
      controller.registerLayoutFactory(ControllerService.baselineLayoutFactory);
      controller.fromModel({
        graph: { id: 'graph', type: 'graph', layout },
        nodes: [{ id: 'route', type: 'node', x: 600, y: 100, width: 300, height: 100 }],
      });
      const route = controller.getNodeById('route')!;
      render(createElement(TopologyElementWrapper, { controller, element: route }, createElement(RouteLinkAnchors)));
      return route;
    };

    it('should start the links to the tools where they leave the route', () => {
      const route = renderAnchors(LayoutType.DagreHorizontal);

      expect(route.getAnchor(AnchorEnd.source, AI_TOOL_EDGE_TYPE).getLocation(new Point(0, 0))).toEqual(
        getRouteLinkStart(route),
      );
    });

    it('should end the links to the tools on the left of a route in a horizontal layout', () => {
      const route = renderAnchors(LayoutType.DagreHorizontal);

      expect(route.getAnchor(AnchorEnd.target, AI_TOOL_EDGE_TYPE).getLocation(new Point(0, 0))).toEqual(
        new Point(600, 150),
      );
    });

    it('should end the links to the tools on the top of a route in a vertical layout', () => {
      const route = renderAnchors(LayoutType.DagreVertical);

      expect(route.getAnchor(AnchorEnd.target, AI_TOOL_EDGE_TYPE).getLocation(new Point(0, 0))).toEqual(
        new Point(750, 100),
      );
    });

    it('should leave the anchors of the other edges as they are', () => {
      const route = renderAnchors(LayoutType.DagreHorizontal);

      expect(route.getAnchor(AnchorEnd.source, 'edge').getLocation(new Point(0, 150))).not.toEqual(
        getRouteLinkStart(route),
      );
    });
  });
});
