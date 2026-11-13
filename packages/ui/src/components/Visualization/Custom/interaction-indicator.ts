/**
 * Geometry of the shared interaction indicator: an SVG rect drawn behind a step or group
 * that shows hover, selection and keyboard focus.
 * The state styling lives in the `interaction-indicator` mixin in `_custom.scss`.
 */

export const INDICATOR_CLEARANCE = 6;
/** How far the floating badges stick out of the icon tile */
export const INDICATOR_BADGE_OVERHANG = 8;
export const INDICATOR_RADIUS = 14;
/** Minimum distance between the indicator and the label below the node */
const LABEL_GAP = 2;
/** Minimum distance between the indicator and the top of the node box, where incoming edges end */
const EDGE_GAP = 2;
/** Size of the square icon tile of a node */
const NODE_TILE_SIZE = 60;
/** Size of the dashed tile of a placeholder node such as "Add step", which has no badges */
const PLACEHOLDER_TILE_SIZE = 36;

export interface IndicatorBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Indicator bounds in node-local SVG coordinates: the icon tile centred in the node box, grown by the
 * badge overhang and clearance on top, left and right, and by the clearance at the bottom. The top stays
 * {@link EDGE_GAP} inside the node box, so incoming edges end outside the indicator; badges on top are painted
 * above it and cover it there. The bottom stays {@link LABEL_GAP} above the label, which starts at `box.height - 1`.
 */
export const getNodeIndicatorBounds = (box: { width: number; height: number }): IndicatorBounds => {
  const inset = INDICATOR_BADGE_OVERHANG + INDICATOR_CLEARANCE;
  const tileX = (box.width - NODE_TILE_SIZE) / 2;
  const tileY = (box.height - NODE_TILE_SIZE) / 2;
  const y = Math.max(tileY - inset, EDGE_GAP);
  const bottom = Math.min(tileY + NODE_TILE_SIZE + INDICATOR_CLEARANCE, box.height - 1 - LABEL_GAP);

  return { x: tileX - inset, y, width: NODE_TILE_SIZE + 2 * inset, height: bottom - y };
};

/** Indicator bounds of a placeholder node: its tile, centred in the node box, grown by the clearance. */
export const getPlaceholderIndicatorBounds = (box: { width: number; height: number }): IndicatorBounds => ({
  x: (box.width - PLACEHOLDER_TILE_SIZE) / 2 - INDICATOR_CLEARANCE,
  y: (box.height - PLACEHOLDER_TILE_SIZE) / 2 - INDICATOR_CLEARANCE,
  width: PLACEHOLDER_TILE_SIZE + 2 * INDICATOR_CLEARANCE,
  height: PLACEHOLDER_TILE_SIZE + 2 * INDICATOR_CLEARANCE,
});

/**
 * Indicator bounds for an expanded group: the body grown on every side by the clearance only, so the indicator
 * stays below the header of a parent group. The warning badge on the top left corner is
 * painted above the indicator and covers it there.
 */
export const getGroupIndicatorBounds = ({ x, y, width, height }: IndicatorBounds): IndicatorBounds => ({
  x: x - INDICATOR_CLEARANCE,
  y: y - INDICATOR_CLEARANCE,
  width: width + 2 * INDICATOR_CLEARANCE,
  height: height + 2 * INDICATOR_CLEARANCE,
});
