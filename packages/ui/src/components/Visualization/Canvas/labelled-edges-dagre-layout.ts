import { DagreGroupsLayout, Edge, LayoutLink, LayoutNode, TOP_TO_BOTTOM } from '@patternfly/react-topology';

import { getIncomingTagLabels, getTagGroupSize, TOPOLOGY_TAG_SIDE_OFFSET } from '../Custom/Edge/topology-tag-size';

/**
 * Gives dagre the size of the tags drawn beside the labelled edges that reach a node, so the layout leaves room for them
 * between the nodes: on the right of the edge in a vertical layout, and above it in a horizontal one.
 * The tags of all the edges that reach a node are drawn together by the first of them, which takes the room of all.
 * Edges without a label take no room, as before.
 */
export class LabelledEdgesDagreGroupsLayout extends DagreGroupsLayout {
  protected createLayoutLink(edge: Edge, source: LayoutNode, target: LayoutNode, isFalse = false): LayoutLink {
    const link = super.createLayoutLink(edge, source, target, isFalse);
    if (!edge.getLabel()) {
      return link;
    }

    const { edges, labels } = getIncomingTagLabels(edge.getTarget());
    if (edges[0] === edge) {
      const isVerticalLayout = this.dagreOptions.rankdir === TOP_TO_BOTTOM;
      const { width, height } = getTagGroupSize(labels, isVerticalLayout);
      /*
       * dagre reads the size and the side of an edge label from these properties of the edge. It lays out a horizontal
       * graph as a vertical one turned a quarter left, so its left side is the top of a horizontal edge.
       */
      Object.assign(link, {
        width,
        height,
        labelpos: isVerticalLayout ? 'r' : 'l',
        labeloffset: TOPOLOGY_TAG_SIDE_OFFSET,
      });
    }
    return link;
  }
}
