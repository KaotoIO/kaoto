import { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';
import { VirtuosoProps } from 'react-virtuoso';

import { ConnectionPortSyncHelper } from '../services/connection-port-sync.helper';
import { TreeConnectionPorts, useDocumentTreeStore } from '../store/document-tree.store';

export const useConnectionPortSync = (documentId: string) => {
  const setNodesConnectionPorts = useDocumentTreeStore((state) => state.setNodesConnectionPorts);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafId.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  const syncConnectionPorts = useCallback(() => {
    /* Cancel any pending update */
    if (rafId.current !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;

      /* Guard against document being undefined (during test cleanup) */
      if (typeof document === 'undefined') return;

      /* Query document-specific ports (includes both node ports and EDGE markers) */
      const documentPortElements = document.querySelectorAll<HTMLElement>(
        `[data-connection-port="true"][data-document-id="${documentId}"]`,
      );

      const documentVisiblePorts: TreeConnectionPorts = {};

      for (const element of documentPortElements) {
        const nodePath = element.dataset.nodePath;
        if (!nodePath) continue;

        /* EDGE elements are always visible, document elements need visibility check */
        const isEdgeElement = nodePath.endsWith(':EDGE:top') || nodePath.endsWith(':EDGE:bottom');

        if (isEdgeElement) {
          documentVisiblePorts[nodePath] = ConnectionPortSyncHelper.getClampedEdgePosition(element);
        } else if (ConnectionPortSyncHelper.isElementVisible(element)) {
          const rect = element.getBoundingClientRect();
          documentVisiblePorts[nodePath] = [rect.x + rect.width / 2, rect.y + rect.height / 2];
        }
      }

      setNodesConnectionPorts(documentId, documentVisiblePorts);
    });
  }, [documentId, setNodesConnectionPorts]);

  // Create Virtuoso components object with custom Scroller that triggers sync on scroll
  const virtuosoComponents = useMemo<VirtuosoProps<unknown, unknown>['components']>(() => {
    const Scroller = forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>((props, ref) => (
      <div {...props} ref={ref} onScroll={syncConnectionPorts} />
    ));
    Scroller.displayName = 'VirtuosoScroller';
    return { Scroller };
  }, [syncConnectionPorts]);

  return { syncConnectionPorts, virtuosoComponents };
};
