import { useCallback, useRef } from 'react';

import { TreeConnectionPorts, useDocumentTreeStore } from '../store/document-tree.store';

export const useDocumentScroll = (documentId: string) => {
  const setNodesConnectionPorts = useDocumentTreeStore((state) => state.setNodesConnectionPorts);
  const rafId = useRef<number | null>(null);

  /**
   * Checks if an element is actually visible within its scroll container
   * (not just in the DOM due to overscan)
   */
  const isElementVisibleInContainer = (element: HTMLElement): boolean => {
    const scrollContainer = element.closest('.expansion-panel__content');
    if (!scrollContainer) return true; // No scroll container, assume visible

    const elemRect = element.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();

    // Check if element is within the container's visible vertical bounds only.
    // Horizontal bounds are intentionally ignored because target connection ports
    // are positioned with a negative `left` value (outside the container's left
    // boundary) via CSS `left: calc(var(--rank-margin) * -0.7)`, so checking
    // horizontal bounds would incorrectly exclude all target ports.
    // Add small buffer to account for rounding errors.
    return elemRect.top >= containerRect.top - 1 && elemRect.bottom <= containerRect.bottom + 1;
  };

  const documentScroll = useCallback(() => {
    /* Cancel any pending update */
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;

      /* Query document-specific ports (includes both node ports and EDGE markers) */
      const documentPortElements = document.querySelectorAll<HTMLElement>(
        `[data-connection-port="true"][data-document-id="${documentId}"]`,
      );

      const documentVisiblePorts: TreeConnectionPorts = {};

      documentPortElements.forEach((element) => {
        const nodePath = element.dataset.nodePath;
        if (!nodePath) return;

        /* EDGE elements are always visible, document elements need visibility check */
        const isEdgeElement = nodePath.endsWith(':EDGE:top') || nodePath.endsWith(':EDGE:bottom');
        if (isEdgeElement || isElementVisibleInContainer(element)) {
          const rect = element.getBoundingClientRect();
          const position: [number, number] = [rect.x + rect.width / 2, rect.y + rect.height / 2];
          documentVisiblePorts[nodePath] = position;
        }
      });

      setNodesConnectionPorts(documentId, documentVisiblePorts);
    });
  }, [documentId, setNodesConnectionPorts]);

  return documentScroll;
};
