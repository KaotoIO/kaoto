import './ExpansionPanels.scss';

import { FunctionComponent, PropsWithChildren, useCallback, useEffect, useMemo, useRef } from 'react';

import { applyConstrainedResize, calculateContainerResize } from './expansion-utils';
import { ExpansionContext, PanelData } from './ExpansionContext';

// Order constants - ensures consistent panel positioning
const ORDER_FIRST = 0; // First panel (if configured)
const ORDER_LAST = 1000; // Last panel (if configured)
const ORDER_START = 1; // Starting order for dynamic panels

interface ExpansionPanelsProps {
  /** ID of the panel that should always be first */
  firstPanelId?: string;
  /** ID of the panel that should always be last */
  lastPanelId?: string;
}

export const ExpansionPanels: FunctionComponent<PropsWithChildren<ExpansionPanelsProps>> = ({
  children,
  firstPanelId,
  lastPanelId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // NOTE: Direct mutation of panel objects is intentional - panels are stored in ref, not React state.
  // Grid updates via CSS variables without triggering React re-renders for better performance.
  const panelsRef = useRef<Map<string, PanelData>>(new Map());

  // Track pending layout change callbacks - executed after CSS transition completes
  const layoutChangeQueueRef = useRef<Array<() => void>>([]);

  /**
   * Update panel orders based on actual DOM order
   * This ensures grid template matches visual panel positions,
   * regardless of when they register or re-register.
   */
  const updateOrdersFromChildren = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Get actual DOM order from the container's children
    const domElements = Array.from(container.children) as HTMLElement[];
    let dynamicOrder = ORDER_START;

    domElements.forEach((element) => {
      // Find the panel by matching the DOM element
      const panel = Array.from(panelsRef.current.values()).find((p) => p.element === element);
      if (panel) {
        // Assign order based on actual DOM position
        if (panel.id === firstPanelId) {
          panel.order = ORDER_FIRST;
        } else if (panel.id === lastPanelId) {
          panel.order = ORDER_LAST;
        } else {
          panel.order = dynamicOrder++;
        }
      }
    });
  }, [firstPanelId, lastPanelId]); // Only depends on panel ID props (stable)

  const updateGridTemplate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Sort panels by order field to maintain stable layout
    const panels = Array.from(panelsRef.current.values()).sort((a, b) => a.order - b.order);
    if (panels.length === 0) return;

    // Create grid template from panel heights (use collapsed height for collapsed panels)
    const templateParts: string[] = [];

    panels.forEach((panel) => {
      const height = panel.isExpanded ? panel.height : panel.collapsedHeight;
      templateParts.push(`${height}px`);
    });

    const template = templateParts.join(' ');
    container.style.setProperty('--grid-template', template);
  }, []);

  /**
   * Fit panels to container height using proportional resize
   * Shared logic used by both ResizeObserver and initial registration
   */
  const fitPanelsToContainer = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const newContainerHeight = container.offsetHeight;
    if (newContainerHeight <= 0) return;

    const panels = Array.from(panelsRef.current.values()).sort((a, b) => a.order - b.order);
    if (panels.length === 0) return;

    const panelInfos = panels.map((p) => ({
      id: p.id,
      height: p.height,
      minHeight: p.minHeight,
      collapsedHeight: p.collapsedHeight,
      isExpanded: p.isExpanded,
    }));

    const result = calculateContainerResize(panelInfos, newContainerHeight);

    if (result.changed) {
      result.newHeights.forEach((height, id) => {
        const panel = panelsRef.current.get(id);
        if (panel?.isExpanded) {
          panel.height = height;
        }
      });
      updateGridTemplate();
    }
  }, [updateGridTemplate]);

  const register = useCallback(
    (id: string, minHeight: number, defaultHeight: number, element: HTMLDivElement, isExpanded: boolean) => {
      const existingPanel = panelsRef.current.get(id);
      const isNewPanel = !existingPanel;

      // Measure collapsed height (header height) from DOM
      const header = element.querySelector('.expansion-panel__summary') as HTMLElement;
      const collapsedHeight = header?.offsetHeight ?? 50;

      // If panel already exists, preserve its current height, expansion state, and order
      // Only update element reference and constraints
      if (existingPanel) {
        existingPanel.element = element;
        existingPanel.minHeight = minHeight;
        existingPanel.collapsedHeight = collapsedHeight;
        // Don't reset height, isExpanded, or order - they may have been modified by user interaction
      } else {
        // New panel - assign order based on special IDs or registration sequence
        let initialOrder;
        if (id === firstPanelId) {
          initialOrder = ORDER_FIRST;
        } else if (id === lastPanelId) {
          initialOrder = ORDER_LAST;
        } else {
          // Assign order based on current panel count (registration sequence)
          // This ensures correct order even when panels are inside fragments/components
          initialOrder = ORDER_START + panelsRef.current.size;
        }

        panelsRef.current.set(id, {
          id,
          height: defaultHeight,
          minHeight,
          collapsedHeight,
          element,
          isExpanded,
          order: initialOrder,
        });
      }

      // Update orders from children, then update grid template
      // Use queueMicrotask for predictable timing (runs before next paint)
      queueMicrotask(() => {
        updateOrdersFromChildren();
        updateGridTemplate();

        const container = containerRef.current;

        // When last panel registers, fit all panels to container height
        // This ensures panels fill the container on initial load
        if (id === lastPanelId) {
          fitPanelsToContainer();
        } else if (isNewPanel && panelsRef.current.size > 1 && container) {
          // When a new panel is dynamically added, check if we need to redistribute space
          // Calculate total height needed by all panels
          const panels = Array.from(panelsRef.current.values());
          const totalHeight = panels.reduce((sum, p) => {
            return sum + (p.isExpanded ? p.height : p.collapsedHeight);
          }, 0);

          // Only redistribute if panels would overflow the container
          if (totalHeight > container.offsetHeight) {
            fitPanelsToContainer();
          }
        }
      });
    },
    [updateGridTemplate, updateOrdersFromChildren, firstPanelId, lastPanelId, fitPanelsToContainer],
  );

  const unregister = useCallback(
    (id: string) => {
      const panel = panelsRef.current.get(id);
      if (!panel) return;

      // Calculate the space being freed by this panel
      const freedSpace = panel.isExpanded ? panel.height : panel.collapsedHeight;

      panelsRef.current.delete(id);

      // Redistribute freed space to remaining expanded panels
      const remainingPanels = Array.from(panelsRef.current.values());
      const expandedPanels = remainingPanels.filter((p) => p.isExpanded);

      if (expandedPanels.length > 0 && freedSpace > 0) {
        const spacePerPanel = freedSpace / expandedPanels.length;
        expandedPanels.forEach((p) => {
          p.height += spacePerPanel;
        });
      }

      updateGridTemplate();
    },
    [updateGridTemplate],
  );

  /**
   * Calculate total space used by collapsed panels
   */
  const calculateCollapsedSpace = useCallback((panels: PanelData[]): number => {
    return panels.reduce((sum, p) => sum + p.collapsedHeight, 0);
  }, []);

  /**
   * Redistribute space among expanded panels equally
   */
  const redistributeSpace = useCallback((panels: PanelData[], availableSpace: number) => {
    const totalMinHeight = panels.reduce((sum, p) => sum + p.minHeight, 0);
    const extraSpace = availableSpace - totalMinHeight;

    if (extraSpace > 0) {
      // Distribute extra space equally among all panels
      // This avoids accumulating rounding errors from proportional distribution
      const extraPerPanel = extraSpace / panels.length;
      panels.forEach((p) => {
        p.height = p.minHeight + extraPerPanel;
      });
    } else {
      // Not enough space - set all to minimum
      panels.forEach((p) => {
        p.height = p.minHeight;
      });
    }
  }, []);

  const resize = useCallback(
    (id: string, newHeight: number) => {
      const container = containerRef.current;
      if (!container) return;

      // Sort panels by order to find adjacent panels correctly
      const panels = Array.from(panelsRef.current.entries()).sort(([, a], [, b]) => a.order - b.order);
      const currentIdx = panels.findIndex(([panelId]) => panelId === id);

      if (currentIdx === -1) return;

      const [, current] = panels[currentIdx];

      // Only allow resizing if current panel is expanded
      if (!current.isExpanded) return;

      // Bottom handle - resizes against panel BELOW
      // Find the next expanded panel (skip collapsed ones)
      let nextIdx = currentIdx + 1;
      while (nextIdx < panels.length && !panels[nextIdx][1].isExpanded) {
        nextIdx++;
      }

      // No expanded panel below - can't resize
      if (nextIdx >= panels.length) return;

      const [, next] = panels[nextIdx];
      const nextCollapsedHeight = next.collapsedHeight;
      applyConstrainedResize(current, next, newHeight, nextCollapsedHeight);

      // Update the grid template
      updateGridTemplate();
    },
    [updateGridTemplate],
  );

  /**
   * Handle expanding a panel - redistributes space among all expanded panels
   */
  const handlePanelExpand = useCallback(
    (panel: PanelData, panels: PanelData[], totalHeight: number) => {
      const otherExpandedPanels = panels.filter((p) => p.isExpanded && p.id !== panel.id);
      const collapsedPanels = panels.filter((p) => !p.isExpanded && p.id !== panel.id);

      const collapsedSpace = calculateCollapsedSpace(collapsedPanels);
      const availableSpace = totalHeight - collapsedSpace;

      if (otherExpandedPanels.length > 0) {
        // Redistribute space among all expanded panels (including the newly expanded one)
        const allExpandedPanels = [...otherExpandedPanels, panel];
        redistributeSpace(allExpandedPanels, availableSpace);
      } else {
        // This is the only expanded panel - give it all available space
        panel.height = Math.max(panel.minHeight, availableSpace);
      }

      panel.isExpanded = true;
    },
    [calculateCollapsedSpace, redistributeSpace],
  );

  /**
   * Handle collapsing a panel - redistributes freed space to other expanded panels
   */
  const handlePanelCollapse = useCallback((panel: PanelData, panels: PanelData[]) => {
    const freedSpace = panel.height - panel.collapsedHeight;

    // Get currently expanded panels (excluding this one that's being collapsed)
    const otherExpandedPanels = panels.filter((p) => p.isExpanded && p.id !== panel.id);

    if (otherExpandedPanels.length > 0) {
      // Distribute freed space equally to other expanded panels
      const spacePerPanel = freedSpace / otherExpandedPanels.length;
      otherExpandedPanels.forEach((p) => {
        p.height += spacePerPanel;
      });
    }

    panel.isExpanded = false;
  }, []);

  const setExpanded = useCallback(
    (id: string, isExpanded: boolean) => {
      const container = containerRef.current;
      if (!container) return;

      const panel = panelsRef.current.get(id);
      if (!panel) return;

      // Early return if no state change
      if (panel.isExpanded === isExpanded) return;

      // Sort panels by order to maintain consistent calculations
      const panels = Array.from(panelsRef.current.values()).sort((a, b) => a.order - b.order);
      const totalHeight = container.offsetHeight;

      if (isExpanded) {
        handlePanelExpand(panel, panels, totalHeight);
      } else {
        handlePanelCollapse(panel, panels);
      }

      updateGridTemplate();
    },
    [updateGridTemplate, handlePanelExpand, handlePanelCollapse],
  );

  /**
   * Queue a layout change callback to be executed after CSS transitions complete
   * This ensures mapping lines are recalculated when browser layout is fully settled
   */
  const queueLayoutChange = useCallback((callback: () => void) => {
    layoutChangeQueueRef.current.push(callback);
  }, []);

  const value = useMemo(
    () => ({ register, unregister, resize, setExpanded, queueLayoutChange }),
    [register, unregister, resize, setExpanded, queueLayoutChange],
  );

  // Update panel orders whenever children change
  useEffect(() => {
    updateOrdersFromChildren();
    updateGridTemplate();
  }, [children, updateOrdersFromChildren, updateGridTemplate]);

  // Handle container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      fitPanelsToContainer();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [fitPanelsToContainer]);

  // Listen to CSS transition end and flush layout change queue
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTransitionEnd = (e: TransitionEvent) => {
      // Only respond to grid-template-rows transitions on this container
      if (e.target !== container || e.propertyName !== 'grid-template-rows') return;

      // Wait for browser to complete layout calculations with double RAF
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Execute all queued callbacks
          const callbacks = [...layoutChangeQueueRef.current];
          layoutChangeQueueRef.current = [];
          callbacks.forEach((callback) => callback());
        });
      });
    };

    container.addEventListener('transitionend', handleTransitionEnd);

    return () => {
      container.removeEventListener('transitionend', handleTransitionEnd);
    };
  }, []);

  // No spacer needed - panels stack naturally in order

  return (
    <div className="expansion-panels" ref={containerRef}>
      <ExpansionContext.Provider value={value}>{children}</ExpansionContext.Provider>
    </div>
  );
};
