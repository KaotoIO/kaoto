import type { Edge, Node } from '@patternfly/react-topology';

/** The tags of an `ai-tool` edge in the topology are drawn as a pill, sized after the length of their text */
export const TOPOLOGY_TAG_HEIGHT = 24;
export const TOPOLOGY_TAG_PADDING = 10;
export const TOPOLOGY_TAG_ICON_SIZE = 12;
/** The room for the icon and the space after it */
export const TOPOLOGY_TAG_ICON_SLOT = 16;
const TOPOLOGY_TAG_CHAR_WIDTH = 7;
/** The space between an edge and the tags beside it */
export const TOPOLOGY_TAG_SIDE_OFFSET = 8;
/** The space between the tags of the edges that reach the same node */
export const TOPOLOGY_TAG_GAP = 4;

export const getTopologyTagWidth = (label: string): number =>
  TOPOLOGY_TAG_PADDING * 2 + TOPOLOGY_TAG_ICON_SLOT + label.length * TOPOLOGY_TAG_CHAR_WIDTH;

/** The tags of a label, whatever their order */
const getTagSetKey = (label: string): string =>
  label
    .split(',')
    .map((tag) => tag.trim())
    .sort((a, b) => a.localeCompare(b))
    .join(',');

/**
 * The labelled edges that reach a node, and their distinct labels: the edges share the segment that reaches the node,
 * so the first of them draws each set of tags once, beside that segment.
 */
export const getIncomingTagLabels = (target: Node): { edges: Edge[]; labels: string[] } => {
  const edges = target.getTargetEdges().filter((edge) => !!edge.getLabel());
  const labels = new Map<string, string>();
  edges.forEach((edge) => {
    const key = getTagSetKey(edge.getLabel());
    if (!labels.has(key)) labels.set(key, edge.getLabel());
  });
  return { edges, labels: [...labels.values()] };
};

/** The room the tags beside a node take: side by side in a vertical layout, stacked in a horizontal one */
export const getTagGroupSize = (labels: string[], isVerticalLayout: boolean): { width: number; height: number } => {
  const widths = labels.map(getTopologyTagWidth);
  const gaps = TOPOLOGY_TAG_GAP * Math.max(labels.length - 1, 0);
  return isVerticalLayout
    ? { width: widths.reduce((sum, width) => sum + width, 0) + gaps, height: TOPOLOGY_TAG_HEIGHT }
    : { width: Math.max(0, ...widths), height: TOPOLOGY_TAG_HEIGHT * labels.length + gaps };
};
