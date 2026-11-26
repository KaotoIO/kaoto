import './TopologyEdge.scss';

import {
  DagreLayoutOptions,
  Edge,
  EdgeStyle,
  EdgeTerminalType,
  GraphElement,
  isEdge,
  Layer,
  TaskEdge,
  TOP_LAYER,
  TOP_TO_BOTTOM,
  useDndManager,
} from '@patternfly/react-topology';
import { observer } from 'mobx-react';
import { FunctionComponent, useCallback, useState } from 'react';

import type { AgentLinkData } from '../../designer-canvas-model';
import {
  getIncomingTagLabels,
  getTopologyTagWidth,
  TOPOLOGY_TAG_GAP,
  TOPOLOGY_TAG_HEIGHT,
  TOPOLOGY_TAG_ICON_SLOT,
  TOPOLOGY_TAG_PADDING,
  TOPOLOGY_TAG_SIDE_OFFSET,
} from './topology-tag-size';
import { getTopologyTagPillWidth, TopologyTag } from './TopologyTag';

/** Spacing for TaskEdge integral bends — aligned with Dagre nodesep/ranksep in topology layout. */
const TOPOLOGY_EDGE_NODE_SEPARATION = 20;

/** Space between the tags and the arrow */
const TOPOLOGY_EDGE_TAG_GAP = TOPOLOGY_TAG_GAP;

/** The size of the TaskEdge end terminal, the arrow the tags keep clear of */
const TOPOLOGY_EDGE_TERMINAL_SIZE = 14;

interface TopologyEdgeProps {
  element: GraphElement;
}

/**
 * The tags sit beside the segment of the TaskEdge integral shape that reaches the target, above every edge so that
 * no line crosses them: above the segment in a horizontal layout, and on its right in a vertical one, where the layout
 * leaves room for them. They sit in the middle of the segment, or next to the arrow when the segment is long, as it is
 * when the edge passes another rank whose nodes the tags would cover.
 * The edges that reach the same node share that segment, so each distinct set of tags is drawn once, by the first
 * edge that reaches the node: stacked upwards in a horizontal layout, and side by side in a vertical one.
 * Each pill fits its text once the text is measured, and is never wider than the room the layout leaves for it.
 */
const TopologyEdgeLabel: FunctionComponent<{ edge: Edge; label: string }> = observer(({ edge, label }) => {
  const [measuredWidths, setMeasuredWidths] = useState<Record<string, number>>({});
  const onMeasure = useCallback((measuredLabel: string, width: number) => {
    setMeasuredWidths((previous) =>
      previous[measuredLabel] === width ? previous : { ...previous, [measuredLabel]: width },
    );
  }, []);

  const startPoint = edge.getStartPoint();
  const endPoint = edge.getEndPoint();
  /* The same check as TaskEdge, which draws the path the tags sit beside */
  const isVerticalLayout = (edge.getGraph().getLayoutOptions?.() as DagreLayoutOptions)?.rankdir === TOP_TO_BOTTOM;
  const { edges: labelledTargetEdges, labels: targetLabels } = getIncomingTagLabels(edge.getTarget());

  if ((labelledTargetEdges[0] ?? edge) !== edge) {
    return null;
  }

  const pills = (targetLabels.length > 0 ? targetLabels : [label]).map((pillLabel) => {
    const maxTextWidth = getTopologyTagWidth(pillLabel) - TOPOLOGY_TAG_PADDING * 2 - TOPOLOGY_TAG_ICON_SLOT;
    const measuredWidth = measuredWidths[pillLabel];
    const isCondensed = measuredWidth !== undefined && measuredWidth > maxTextWidth;
    const textWidth = measuredWidth === undefined || isCondensed ? maxTextWidth : measuredWidth;
    return { label: pillLabel, textWidth, isCondensed, width: getTopologyTagPillWidth(textWidth) };
  });
  /** How far the center of a tag of this size stays from the end of the edge, to keep clear of the arrow */
  const arrowClearance = (size: number) => TOPOLOGY_EDGE_TERMINAL_SIZE + TOPOLOGY_EDGE_TAG_GAP + size / 2;
  let positions: { x: number; y: number }[];

  if (isVerticalLayout) {
    const cornerY = Math.floor(startPoint.y + TOPOLOGY_EDGE_NODE_SEPARATION / 2);
    const y = Math.max((cornerY + endPoint.y) / 2, endPoint.y - arrowClearance(TOPOLOGY_TAG_HEIGHT));
    let left = endPoint.x + TOPOLOGY_TAG_SIDE_OFFSET;
    positions = pills.map((pill) => {
      const position = { x: left, y };
      left += pill.width + TOPOLOGY_EDGE_TAG_GAP;
      return position;
    });
  } else {
    const cornerX = Math.floor(startPoint.x + TOPOLOGY_EDGE_NODE_SEPARATION / 2);
    const widest = Math.max(...pills.map((pill) => pill.width));
    const centerX = Math.max((cornerX + endPoint.x) / 2, endPoint.x - arrowClearance(widest));
    positions = pills.map((pill, index) => ({
      x: centerX - pill.width / 2,
      y:
        endPoint.y -
        TOPOLOGY_TAG_SIDE_OFFSET -
        TOPOLOGY_TAG_HEIGHT / 2 -
        index * (TOPOLOGY_TAG_HEIGHT + TOPOLOGY_EDGE_TAG_GAP),
    }));
  }

  return (
    <Layer id={TOP_LAYER}>
      {pills.map((pill, index) => (
        <TopologyTag
          key={pill.label}
          x={positions[index].x}
          y={positions[index].y}
          label={pill.label}
          textWidth={pill.textWidth}
          isCondensed={pill.isCondensed}
          onMeasure={onMeasure}
        />
      ))}
    </Layer>
  );
});

/*
 * In the Design view a step dragged out of an agent route moves the bounds of the route, but the route is drawn where
 * it was until the drop: the link to the tools is hidden meanwhile, as the links inside the route are.
 */
const TopologyEdgeContent: FunctionComponent<{ edge: Edge }> = observer(({ edge, ...props }) => {
  const dndManager = useDndManager();
  const isAgentLink = ((edge.getData() as AgentLinkData | undefined)?.sourceSteps.length ?? 0) > 0;
  if (isAgentLink && dndManager.isDragging()) {
    return null;
  }

  const label = edge.getLabel();

  return (
    <>
      <TaskEdge
        element={edge}
        className={edge.getEdgeStyle() === EdgeStyle.dashed ? 'topology-edge--dashed' : undefined}
        endTerminalType={EdgeTerminalType.directional}
        nodeSeparation={TOPOLOGY_EDGE_NODE_SEPARATION}
        {...props}
      />
      {label && <TopologyEdgeLabel edge={edge} label={label} />}
    </>
  );
});

const TopologyEdge: FunctionComponent<TopologyEdgeProps> = ({ element, ...props }) => {
  if (!isEdge(element)) {
    throw new Error('TopologyEdge must be used only on Edge elements');
  }

  return <TopologyEdgeContent edge={element} {...props} />;
};

export default observer(TopologyEdge);
