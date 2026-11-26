import { Tag } from '@carbon/icons-react';
import { FunctionComponent, useCallback } from 'react';

import {
  TOPOLOGY_TAG_HEIGHT,
  TOPOLOGY_TAG_ICON_SIZE,
  TOPOLOGY_TAG_ICON_SLOT,
  TOPOLOGY_TAG_PADDING,
} from './topology-tag-size';

interface TopologyTagProps {
  /** The left edge of the pill */
  x: number;
  /** The middle of the pill */
  y: number;
  label: string;
  /** The room for the text; a measured text that is wider than that is condensed to fit */
  textWidth: number;
  isCondensed: boolean;
  /** Receives the width of the text as it is drawn, once per label */
  onMeasure: (label: string, width: number) => void;
}

export const getTopologyTagPillWidth = (textWidth: number): number =>
  TOPOLOGY_TAG_PADDING * 2 + TOPOLOGY_TAG_ICON_SLOT + textWidth;

/** The tags an agent route shares with an `ai-tool` route, drawn as a pill beside the edge between them */
export const TopologyTag: FunctionComponent<TopologyTagProps> = ({
  x,
  y,
  label,
  textWidth,
  isCondensed,
  onMeasure,
}) => {
  const width = getTopologyTagPillWidth(textWidth);
  /* Measured when the text is first drawn, before it is condensed */
  const measureText = useCallback(
    (node: SVGTextElement | null) => {
      const measuredWidth = node?.getBBox().width;
      if (measuredWidth) {
        onMeasure(label, measuredWidth);
      }
    },
    [label, onMeasure],
  );

  return (
    <g
      className="topology-edge__tag"
      data-testid="topology-edge-tag"
      transform={`translate(${x}, ${y - TOPOLOGY_TAG_HEIGHT / 2})`}
    >
      <title>{`Tags: ${label}`}</title>
      <rect
        className="topology-edge__tag__background"
        width={width}
        height={TOPOLOGY_TAG_HEIGHT}
        rx={TOPOLOGY_TAG_HEIGHT / 2}
        ry={TOPOLOGY_TAG_HEIGHT / 2}
      />
      <Tag
        className="topology-edge__tag__icon"
        x={TOPOLOGY_TAG_PADDING}
        y={(TOPOLOGY_TAG_HEIGHT - TOPOLOGY_TAG_ICON_SIZE) / 2}
        width={TOPOLOGY_TAG_ICON_SIZE}
        height={TOPOLOGY_TAG_ICON_SIZE}
      />
      <text
        ref={measureText}
        className="topology-edge__tag__label"
        x={TOPOLOGY_TAG_PADDING + TOPOLOGY_TAG_ICON_SLOT}
        y={TOPOLOGY_TAG_HEIGHT / 2}
        dominantBaseline="central"
        textLength={isCondensed ? textWidth : undefined}
        lengthAdjust={isCondensed ? 'spacingAndGlyphs' : undefined}
      >
        {label}
      </text>
    </g>
  );
};
