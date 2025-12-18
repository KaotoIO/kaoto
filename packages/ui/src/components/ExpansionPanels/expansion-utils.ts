import { PanelData } from './ExpansionContext';

/**
 * Get effective min height for a panel based on its state
 * @param panel - The panel to check
 * @param collapsedHeight - The height when panel is collapsed
 * @returns The effective minimum height (minHeight if expanded, collapsedHeight if collapsed)
 */
export const getEffectiveMinHeight = (panel: PanelData, collapsedHeight: number): number => {
  return panel.isExpanded ? panel.minHeight : collapsedHeight;
};

/**
 * Calculate constrained delta for resize operation
 * @param delta - The requested change in height
 * @param maxGrow - Maximum amount the panel can grow
 * @param maxShrink - Maximum amount the panel can shrink
 * @returns The actual delta that respects constraints
 */
export const calculateConstrainedDelta = (delta: number, maxGrow: number, maxShrink: number): number => {
  return delta > 0 ? Math.min(delta, maxGrow) : Math.max(delta, -maxShrink);
};

/**
 * Apply constrained resize between two panels
 * @param currentPanel - The panel being resized
 * @param adjacentPanel - The adjacent panel that gives/takes space
 * @param newHeight - The requested new height for current panel
 * @param adjacentCollapsedHeight - The collapsed height of the adjacent panel
 */
export const applyConstrainedResize = (
  currentPanel: PanelData,
  adjacentPanel: PanelData,
  newHeight: number,
  adjacentCollapsedHeight: number,
): void => {
  const delta = newHeight - currentPanel.height;
  const adjacentMinHeight = getEffectiveMinHeight(adjacentPanel, adjacentCollapsedHeight);
  const maxGrow = adjacentPanel.height - adjacentMinHeight;
  const maxShrink = currentPanel.height - currentPanel.minHeight;

  const actualDelta = calculateConstrainedDelta(delta, maxGrow, maxShrink);

  currentPanel.height += actualDelta;
  adjacentPanel.height -= actualDelta;
};
