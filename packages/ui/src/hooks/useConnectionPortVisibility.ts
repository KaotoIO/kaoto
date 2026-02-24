import { RefObject, useCallback, useEffect, useMemo } from 'react';

import { useDocumentTreeStore } from '../store/document-tree.store';

/**
 * Sets up IntersectionObserver to track visibility of connection ports within a scroll container.
 * Only visible ports are registered in the store, improving performance by filtering out
 * overscan elements that are rendered but not actually visible in the viewport.
 *
 * Connection ports are child elements within document nodes (BaseNode components).
 * When virtual scrolling adds/removes document nodes, this hook finds and observes
 * the connection ports within them.
 *
 * @param scrollContainerRef - Reference to the scroll container element (expansion panel content) or null
 */
export const useConnectionPortVisibility = (scrollContainerRef: RefObject<HTMLElement | null> | null) => {
  const setConnectionPort = useDocumentTreeStore((state) => state.setConnectionPort);
  const unsetConnectionPort = useDocumentTreeStore((state) => state.unsetConnectionPort);

  /* Map to track which ports we're currently observing */
  const observedPorts = useMemo(() => new Map<Element, string>(), []);

  /**
   * IntersectionObserver callback - handles elements entering/leaving viewport
   */
  const intersectionCallback: IntersectionObserverCallback = useCallback(
    (entries) => {
      entries.forEach((entry) => {
        const nodePath = (entry.target as HTMLElement).dataset.nodePath;
        if (!nodePath) return;

        if (entry.isIntersecting) {
          // Element is visible - calculate and register position
          // This fires both when element first enters AND when it moves within viewport
          // updatePortPosition(entry.target as HTMLElement);
          const rect = entry.target.getBoundingClientRect();
          const position: [number, number] = [rect.x + rect.width / 2, rect.y + rect.height / 2];
          setConnectionPort(nodePath, position);
        } else {
          // Element is no longer visible - unregister
          unsetConnectionPort(nodePath);
        }
      });
    },
    [setConnectionPort, unsetConnectionPort],
  );

  useEffect(() => {
    if (!scrollContainerRef?.current) return;

    // Create IntersectionObserver with the scroll container as root
    // threshold: 0 means fire as soon as any pixel is visible
    // rootMargin: Shrink the intersection area to create a buffer zone
    // This ensures elements in Virtuoso's overscan are marked as not intersecting
    const intersectionObserver = new IntersectionObserver(intersectionCallback, {
      root: scrollContainerRef.current,
      threshold: 0,
      rootMargin: '-10px', // 10px buffer to exclude overscan elements
    });

    /**
     * MutationObserver callback - handles new connection ports being added to DOM
     */
    const mutationCallback: MutationCallback = (mutations) => {
      mutations.forEach((mutation) => {
        // Check added nodes for connection ports within them
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const element = node as HTMLElement;

          // Find all connection ports within the added node
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
          const element = node as HTMLElement;

          // Find all connection ports within the removed node
          const ports = element.querySelectorAll('[data-connection-port="true"]');
          ports.forEach((port) => {
            const nodePath = observedPorts.get(port);
            if (nodePath) {
              intersectionObserver.unobserve(port);
              unsetConnectionPort(nodePath);
              observedPorts.delete(port);
            }
          });
        });
      });
    };

    // Create MutationObserver to watch for new connection ports
    const mutationObserver = new MutationObserver(mutationCallback);

    // Start observing the container for child node additions/removals
    mutationObserver.observe(scrollContainerRef.current, {
      childList: true,
      subtree: true,
    });

    // Observe all existing connection ports
    const existingPorts = scrollContainerRef.current.querySelectorAll('[data-connection-port="true"]');
    existingPorts.forEach((port) => {
      const nodePath = (port as HTMLElement).dataset.nodePath;
      if (nodePath) {
        intersectionObserver.observe(port);
        observedPorts.set(port, nodePath);
      }
    });

    return () => {
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
      observedPorts.clear();
    };
  }, [intersectionCallback, observedPorts, scrollContainerRef, setConnectionPort, unsetConnectionPort]);
};
