/**
 * Updates positions of currently visible connection ports after layout changes
 * (panel resize, expand/collapse) or scroll.
 *
 * This function rebuilds the entire connection ports map by scanning the DOM
 * for visible elements, ensuring stale ports are removed.
 */

import { useDocumentTreeStore } from '../store/document-tree.store';

let rafId: number | null = null;

/**
 * Checks if an element is actually visible within its scroll container
 * (not just in the DOM due to overscan)
 */
function isElementVisibleInContainer(element: HTMLElement): boolean {
  const scrollContainer = element.closest('.expansion-panel__content');
  if (!scrollContainer) return true; // No scroll container, assume visible

  const elemRect = element.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();

  // Check if element is within the container's visible bounds
  // Add small buffer to account for rounding errors
  return (
    elemRect.top >= containerRect.top - 1 &&
    elemRect.bottom <= containerRect.bottom + 1 &&
    elemRect.left >= containerRect.left - 1 &&
    elemRect.right <= containerRect.right + 1
  );
}

/**
 * Rebuilds connection ports map from scratch based on what's actually visible in the DOM.
 * Called on scroll or when panel layout changes (resize, expand, collapse).
 * This approach is simpler and more robust than trying to track incremental changes.
 */
export const updateVisiblePortPositions = () => {
  // Cancel any pending update
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
  }

  rafId = requestAnimationFrame(() => {
    rafId = null;

    // Find ALL connection port elements in the DOM
    const allPortElements = document.querySelectorAll<HTMLElement>('[data-connection-port="true"]');

    // Build fresh map of ONLY visible ports
    const visiblePorts: Record<string, [number, number]> = {};

    allPortElements.forEach((element) => {
      const nodePath = element.dataset.nodePath;
      if (!nodePath) return;

      // Only include if actually visible (not in overscan)
      if (isElementVisibleInContainer(element)) {
        const rect = element.getBoundingClientRect();
        const position: [number, number] = [rect.x + rect.width / 2, rect.y + rect.height / 2];
        visiblePorts[nodePath] = position;
      }
    });

    // Replace the entire connection ports map with fresh data
    // This automatically removes stale ports
    useDocumentTreeStore.setState((state) => ({
      nodesConnectionPorts: visiblePorts,
      connectionPortVersion: state.connectionPortVersion + 1,
    }));
  });
};
