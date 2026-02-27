import { useCallback, useEffect, useRef } from 'react';

import { TreeConnectionPorts, useDocumentTreeStore } from '../store/document-tree.store';

export const useDocumentScroll = (documentId: string, contentRef: React.RefObject<HTMLDivElement | null>) => {
  const setNodesConnectionPorts = useDocumentTreeStore((state) => state.setNodesConnectionPorts);
  const rafId = useRef<number | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

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

      /* Query document-specific ports and shared EDGE elements in a single selector */
      const documentPortElements = document.querySelectorAll<HTMLElement>(
        `[data-connection-port="true"][data-document-id="${documentId}"], [data-connection-port="true"][data-node-path^="EDGE:"]`,
      );

      const documentVisiblePorts: TreeConnectionPorts = {};

      documentPortElements.forEach((element) => {
        const nodePath = element.dataset.nodePath;
        if (!nodePath) return;

        /* EDGE elements are always visible, document elements need visibility check */
        const isEdgeElement = nodePath.startsWith('EDGE:');
        if (isEdgeElement || isElementVisibleInContainer(element)) {
          const rect = element.getBoundingClientRect();
          const position: [number, number] = [rect.x + rect.width / 2, rect.y + rect.height / 2];
          documentVisiblePorts[nodePath] = position;
        }
      });

      setNodesConnectionPorts(documentId, documentVisiblePorts);
    });
  }, [documentId, setNodesConnectionPorts]);

  // Set up MutationObserver to watch for DOM changes in the expansion panel content
  useEffect(() => {
    const contentElement = contentRef?.current;
    if (!contentElement) return;

    // Create observer that watches for child node additions/removals
    observerRef.current = new MutationObserver(() => {
      // Trigger connection port update when DOM changes
      documentScroll();
    });

    // Start observing the content element for child list changes and subtree modifications
    observerRef.current.observe(contentElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [contentRef, documentScroll]);

  return documentScroll;
};
