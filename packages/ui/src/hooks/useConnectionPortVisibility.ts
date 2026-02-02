import { RefObject, useEffect } from 'react';

import { useDocumentTreeStore } from '../store/document-tree.store';

/**
 * Sets up IntersectionObserver to track visibility of connection ports within a scroll container.
 * Only visible ports are registered in the store, improving performance by filtering out
 * overscan elements that are rendered but not actually visible in the viewport.
 *
 * @param scrollContainerRef - Reference to the scroll container element (expansion panel content) or null
 */
export const useConnectionPortVisibility = (scrollContainerRef: RefObject<HTMLElement | null> | null) => {
  const setConnectionPort = useDocumentTreeStore((state) => state.setConnectionPort);
  const unsetConnectionPort = useDocumentTreeStore((state) => state.unsetConnectionPort);

  useEffect(() => {
    // Skip if no ref provided or no container element
    if (!scrollContainerRef) return;
    const containerElement = scrollContainerRef.current;
    if (!containerElement) return;

    // Map to track which ports we're currently observing
    const observedPorts = new Map<Element, string>();

    /**
     * Calculate and update position for a connection port element
     */
    const updatePortPosition = (element: Element) => {
      const nodePath = (element as HTMLElement).dataset.nodePath;
      if (!nodePath) return;

      const rect = element.getBoundingClientRect();
      const position: [number, number] = [rect.x + rect.width / 2, rect.y + rect.height / 2];

      setConnectionPort(nodePath, position);
    };

    /**
     * IntersectionObserver callback - handles elements entering/leaving viewport
     */
    const intersectionCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        const nodePath = (entry.target as HTMLElement).dataset.nodePath;
        if (!nodePath) return;

        if (entry.isIntersecting) {
          // Element is visible - calculate and register position
          // This fires both when element first enters AND when it moves within viewport
          updatePortPosition(entry.target);
        } else {
          // Element is no longer visible - unregister
          unsetConnectionPort(nodePath);
        }
      });
    };

    // Create IntersectionObserver with the scroll container as root
    // threshold: 0 means fire as soon as any pixel is visible
    // rootMargin: Shrink the intersection area to create a buffer zone
    // This ensures elements in Virtuoso's overscan are marked as not intersecting
    const intersectionObserver = new IntersectionObserver(intersectionCallback, {
      root: containerElement,
      threshold: 0,
      rootMargin: '-10px', // 10px buffer to exclude overscan elements
    });

    /**
     * MutationObserver callback - handles new connection ports being added to DOM
     */
    const mutationCallback: MutationCallback = (mutations) => {
      mutations.forEach((mutation) => {
        // Check added nodes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          const element = node as Element;

          // Check if the added node itself is a connection port
          if (element.getAttribute('data-connection-port') === 'true') {
            const nodePath = (element as HTMLElement).dataset.nodePath;
            if (nodePath && !observedPorts.has(element)) {
              intersectionObserver.observe(element);
              observedPorts.set(element, nodePath);
            }
          }

          // Check for connection ports within the added node
          const ports = element.querySelectorAll('[data-connection-port="true"]');
          ports.forEach((port) => {
            const nodePath = (port as HTMLElement).dataset.nodePath;
            if (nodePath && !observedPorts.has(port)) {
              intersectionObserver.observe(port);
              observedPorts.set(port, nodePath);
            }
          });
        });

        // Handle removed nodes - clean up observation tracking AND remove from store
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          const element = node as Element;

          // If removed node is a connection port
          if (observedPorts.has(element)) {
            const nodePath = observedPorts.get(element);
            if (nodePath) {
              intersectionObserver.unobserve(element);
              unsetConnectionPort(nodePath);
              observedPorts.delete(element);
            }
          }

          // Check for connection ports within removed node
          const ports = element.querySelectorAll('[data-connection-port="true"]');
          ports.forEach((port) => {
            if (observedPorts.has(port)) {
              const nodePath = observedPorts.get(port);
              if (nodePath) {
                intersectionObserver.unobserve(port);
                unsetConnectionPort(nodePath);
                observedPorts.delete(port);
              }
            }
          });
        });
      });
    };

    // Create MutationObserver to watch for new connection ports
    const mutationObserver = new MutationObserver(mutationCallback);

    // Start observing the container for child node additions/removals
    mutationObserver.observe(containerElement, {
      childList: true,
      subtree: true,
    });

    // Observe all existing connection ports
    const existingPorts = containerElement.querySelectorAll('[data-connection-port="true"]');
    existingPorts.forEach((port) => {
      const nodePath = (port as HTMLElement).dataset.nodePath;
      if (nodePath) {
        intersectionObserver.observe(port);
        observedPorts.set(port, nodePath);
      }
    });

    // Cleanup on unmount
    return () => {
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
      observedPorts.clear();
    };
  }, [scrollContainerRef, setConnectionPort, unsetConnectionPort]);
};
