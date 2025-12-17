import { PanelData } from './ExpansionContext';

/** Minimal panel info needed for resize calculations (avoids DOM dependency) */
export interface PanelResizeInfo {
  id: string;
  height: number;
  minHeight: number;
  collapsedHeight: number;
  isExpanded: boolean;
}

/** Result of container resize calculation */
export interface ContainerResizeResult {
  /** Map of panel id to new height */
  newHeights: Map<string, number>;
  /** Whether any heights changed */
  changed: boolean;
}

/**
 * Calculate total current height of all panels.
 * Uses collapsed height for collapsed panels, current height for expanded.
 */
export const calculateTotalHeight = (panels: PanelResizeInfo[]): number => {
  return panels.reduce((sum, panel) => {
    return sum + (panel.isExpanded ? panel.height : panel.collapsedHeight);
  }, 0);
};

/**
 * Calculate proportional heights for expanded panels based on available space.
 * Respects minHeight constraints.
 */
export const calculateProportionalHeights = (
  expandedPanels: PanelResizeInfo[],
  availableSpace: number,
): Map<string, number> => {
  const heights = new Map<string, number>();

  if (expandedPanels.length === 0) {
    return heights;
  }

  const currentTotal = expandedPanels.reduce((sum, p) => sum + p.height, 0);
  const ratio = availableSpace / currentTotal;

  expandedPanels.forEach((panel) => {
    const newHeight = Math.max(panel.minHeight, panel.height * ratio);
    heights.set(panel.id, newHeight);
  });

  return heights;
};

/**
 * Adjust heights to ensure pixel-perfect fit.
 * Distributes remaining pixels to the last panel.
 */
export const adjustForPixelPerfectFit = (
  heights: Map<string, number>,
  targetTotal: number,
  panelIds: string[],
): void => {
  const currentTotal = Array.from(heights.values()).reduce((sum, h) => sum + h, 0);
  const diff = targetTotal - currentTotal;

  if (diff !== 0 && panelIds.length > 0) {
    const lastId = panelIds[panelIds.length - 1];
    const currentHeight = heights.get(lastId) ?? 0;
    heights.set(lastId, currentHeight + diff);
  }
};

/**
 * Calculate new panel heights when container resizes.
 * Pure function - no side effects, easy to test.
 *
 * @param panels - Array of panel info (sorted by order)
 * @param newContainerHeight - The new container height
 * @returns Object with new heights map and changed flag
 */
export const calculateContainerResize = (
  panels: PanelResizeInfo[],
  newContainerHeight: number,
): ContainerResizeResult => {
  const newHeights = new Map<string, number>();

  if (panels.length === 0 || newContainerHeight <= 0) {
    return { newHeights, changed: false };
  }

  const currentTotal = calculateTotalHeight(panels);

  // If no difference, no changes needed
  if (currentTotal === newContainerHeight) {
    return { newHeights, changed: false };
  }

  const collapsedPanels = panels.filter((p) => !p.isExpanded);
  const expandedPanels = panels.filter((p) => p.isExpanded);

  // Set heights for collapsed panels (unchanged)
  collapsedPanels.forEach((p) => {
    newHeights.set(p.id, p.collapsedHeight);
  });

  if (expandedPanels.length === 0) {
    return { newHeights, changed: false };
  }

  // Calculate available space for expanded panels
  const collapsedSpace = collapsedPanels.reduce((sum, p) => sum + p.collapsedHeight, 0);
  const availableSpace = newContainerHeight - collapsedSpace;

  // Calculate proportional heights for expanded panels
  const expandedHeights = calculateProportionalHeights(expandedPanels, availableSpace);

  // Ensure pixel-perfect fit
  const expandedIds = expandedPanels.map((p) => p.id);
  adjustForPixelPerfectFit(expandedHeights, availableSpace, expandedIds);

  // Merge expanded heights into result
  expandedHeights.forEach((height, id) => {
    newHeights.set(id, height);
  });

  return { newHeights, changed: true };
};

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
