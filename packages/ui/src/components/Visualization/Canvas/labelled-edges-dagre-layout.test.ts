import {
  DagreGroupsLayout,
  Graph,
  Layout,
  LayoutLink,
  LayoutNode,
  LEFT_TO_RIGHT,
  TOP_TO_BOTTOM,
  Visualization,
} from '@patternfly/react-topology';

import { getTopologyTagWidth, TOPOLOGY_TAG_GAP, TOPOLOGY_TAG_HEIGHT } from '../Custom/Edge/topology-tag-size';
import { LayoutType } from './canvas.models';
import { ControllerService } from './controller.service';
import { LabelledEdgesDagreGroupsLayout } from './labelled-edges-dagre-layout';

/** The layout Kaoto used before, with the same options */
const originalLayoutFactory = (type: string, graph: Graph): Layout => {
  const isHorizontal = type === LayoutType.DagreHorizontal;
  return new DagreGroupsLayout(graph, {
    rankdir: isHorizontal ? LEFT_TO_RIGHT : TOP_TO_BOTTOM,
    nodeDistance: isHorizontal ? 30 : 40,
    ranker: 'network-simplex',
    nodesep: 10,
    edgesep: 10,
    ranksep: 0,
  });
};

/** Lays out an agent and a tool linked by one edge, and returns the space between them along the layout direction */
const getGapBetweenRanks = (
  layout: LayoutType,
  label?: string,
  layoutFactory: typeof originalLayoutFactory = ControllerService.baselineLayoutFactory as typeof originalLayoutFactory,
): number => {
  const controller = new Visualization();
  controller.registerLayoutFactory(layoutFactory);
  controller.fromModel({
    graph: { id: 'graph', type: 'graph', layout },
    nodes: [
      { id: 'agent', type: 'node', width: 90, height: 75 },
      { id: 'tool', type: 'node', width: 90, height: 75 },
    ],
    edges: [{ id: 'agent >>> tool', type: 'edge', source: 'agent', target: 'tool', label }],
  });
  controller.getGraph().layout();

  const agent = controller.getNodeById('agent')!.getBounds();
  const tool = controller.getNodeById('tool')!.getBounds();
  return layout === LayoutType.DagreHorizontal ? tool.x - agent.right() : tool.y - agent.bottom();
};

describe('LabelledEdgesDagreGroupsLayout', () => {
  it('leaves room for the tag of a labelled edge between the ranks of a horizontal layout', () => {
    const unlabelledGap = getGapBetweenRanks(LayoutType.DagreHorizontal);
    const labelledGap = getGapBetweenRanks(LayoutType.DagreHorizontal, 'customer-support');

    expect(labelledGap - unlabelledGap).toBeGreaterThanOrEqual(getTopologyTagWidth('customer-support'));
  });

  it('leaves room for the tag of a labelled edge between the ranks of a vertical layout', () => {
    const unlabelledGap = getGapBetweenRanks(LayoutType.DagreVertical);
    const labelledGap = getGapBetweenRanks(LayoutType.DagreVertical, 'customer-support');

    expect(labelledGap - unlabelledGap).toBeGreaterThanOrEqual(TOPOLOGY_TAG_HEIGHT);
  });

  it.each([LayoutType.DagreHorizontal, LayoutType.DagreVertical])(
    'lays out an edge without a label as the original layout does in a %s layout',
    (layout) => {
      expect(getGapBetweenRanks(layout)).toEqual(getGapBetweenRanks(layout, undefined, originalLayoutFactory));
    },
  );

  describe('the tags of the edges that reach the same node', () => {
    /** The layout link of each edge from two agents to one tool, labelled with the given tags */
    const getLinks = (layout: LayoutType, labels: string[]) => {
      const controller = new Visualization();
      controller.registerLayoutFactory(ControllerService.baselineLayoutFactory);
      controller.fromModel({
        graph: { id: 'graph', type: 'graph', layout },
        nodes: [
          ...labels.map((_, index) => ({ id: `agent-${index}`, type: 'node', width: 90, height: 75 })),
          { id: 'tool', type: 'node', width: 90, height: 75 },
        ],
        edges: labels.map((label, index) => ({
          id: `edge-${index}`,
          type: 'edge',
          source: `agent-${index}`,
          target: 'tool',
          label,
        })),
      });
      const dagreLayout = ControllerService.baselineLayoutFactory(
        layout,
        controller.getGraph(),
      ) as LabelledEdgesDagreGroupsLayout;
      const createLink = (
        dagreLayout as unknown as {
          createLayoutLink: (
            edge: unknown,
            source: LayoutNode,
            target: LayoutNode,
          ) => LayoutLink & Record<string, number>;
        }
      ).createLayoutLink.bind(dagreLayout);
      return labels.map((_, index) =>
        createLink(controller.getEdgeById(`edge-${index}`)!, {} as LayoutNode, {} as LayoutNode),
      );
    };

    it('reserves the room of all the tags, side by side, on the first edge in a vertical layout', () => {
      const [first, second] = getLinks(LayoutType.DagreVertical, ['support', 'billing']);

      expect(first.width).toEqual(getTopologyTagWidth('support') + TOPOLOGY_TAG_GAP + getTopologyTagWidth('billing'));
      expect(first.height).toEqual(TOPOLOGY_TAG_HEIGHT);
      expect(second.width).toBeUndefined();
    });

    it('reserves the room of all the tags, stacked, on the first edge in a horizontal layout', () => {
      const [first, second] = getLinks(LayoutType.DagreHorizontal, ['support', 'billing']);

      expect(first.width).toEqual(getTopologyTagWidth('support'));
      expect(first.height).toEqual(2 * TOPOLOGY_TAG_HEIGHT + TOPOLOGY_TAG_GAP);
      expect(second.height).toBeUndefined();
    });
  });
});
