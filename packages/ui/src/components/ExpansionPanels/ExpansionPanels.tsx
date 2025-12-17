import './ExpansionPanels.scss';

import React, { FunctionComponent, PropsWithChildren, useCallback, useEffect, useMemo, useRef } from 'react';

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
  const childrenRef = useRef(children);
  childrenRef.current = children;

  const getCollapsedHeight = useCallback((panel: PanelData): number => {
    // Use the cached collapsed height (measured from header on registration)
    return panel.collapsedHeight;
  }, []);

  /**
   * Update panel orders based on React children order (JSX order)
   * This ensures panels appear in the same order as they're written in JSX,
   * regardless of when they register or re-register.
   */
  const updateOrdersFromChildren = useCallback(() => {
    const childrenArray = React.Children.toArray(childrenRef.current);
    let dynamicOrder = ORDER_START;

    childrenArray.forEach((child) => {
      if (React.isValidElement<{ id?: string }>(child) && child.props?.id) {
        const panel = panelsRef.current.get(child.props.id);
        if (panel) {
          // Assign order based on panel ID
          if (child.props.id === firstPanelId) {
            panel.order = ORDER_FIRST;
          } else if (child.props.id === lastPanelId) {
            panel.order = ORDER_LAST;
          } else {
            // Dynamic panels get sequential order based on JSX position
            panel.order = dynamicOrder++;
          }
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
      const height = panel.isExpanded ? panel.height : getCollapsedHeight(panel);
      templateParts.push(`${height}px`);
    });

    const template = templateParts.join(' ');
    container.style.setProperty('--grid-template', template);
  }, [getCollapsedHeight]);

  const register = useCallback(
    (id: string, minHeight: number, defaultHeight: number, element: HTMLDivElement, isExpanded: boolean) => {
      const existingPanel = panelsRef.current.get(id);

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
        // New panel - assign temporary order (will be updated by updateOrdersFromChildren)
        panelsRef.current.set(id, {
          id,
          height: defaultHeight,
          minHeight,
          collapsedHeight,
          element,
          isExpanded,
          order: 999, // Temporary order, will be set correctly by updateOrdersFromChildren
        });
      }

      // Update orders from children, then update grid template
      // Use queueMicrotask for predictable timing (runs before next paint)
      queueMicrotask(() => {
        updateOrdersFromChildren();
        updateGridTemplate();
      });
    },
    [updateGridTemplate, updateOrdersFromChildren],
  );

  const unregister = useCallback(
    (id: string) => {
      panelsRef.current.delete(id);
      updateGridTemplate();
    },
    [updateGridTemplate],
  );

  /**
   * Calculate total space used by collapsed panels
   */
  const calculateCollapsedSpace = useCallback(
    (panels: PanelData[]): number => {
      return panels.reduce((sum, p) => sum + getCollapsedHeight(p), 0);
    },
    [getCollapsedHeight],
  );

  /**
   * Redistribute space among expanded panels proportionally
   */
  const redistributeSpace = useCallback((panels: PanelData[], availableSpace: number) => {
    const totalMinHeight = panels.reduce((sum, p) => sum + p.minHeight, 0);
    const extraSpace = availableSpace - totalMinHeight;

    if (extraSpace > 0) {
      // Distribute space proportionally based on current heights
      const totalCurrentHeight = panels.reduce((sum, p) => sum + p.height, 0);
      panels.forEach((p) => {
        const ratio = p.height / totalCurrentHeight;
        p.height = p.minHeight + extraSpace * ratio;
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
      const nextCollapsedHeight = getCollapsedHeight(next);
      applyConstrainedResize(current, next, newHeight, nextCollapsedHeight);

      // Update the grid template
      updateGridTemplate();
    },
    [updateGridTemplate, getCollapsedHeight],
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
  const handlePanelCollapse = useCallback(
    (panel: PanelData, panels: PanelData[]) => {
      const collapsedHeight = getCollapsedHeight(panel);
      const freedSpace = panel.height - collapsedHeight;

      // Get currently expanded panels (excluding this one that's being collapsed)
      const otherExpandedPanels = panels.filter((p) => p.isExpanded && p.id !== panel.id);

      if (otherExpandedPanels.length > 0) {
        // Distribute freed space proportionally to other expanded panels
        const totalExpandedHeight = otherExpandedPanels.reduce((sum, p) => sum + p.height, 0);

        otherExpandedPanels.forEach((p) => {
          const ratio = p.height / totalExpandedHeight;
          p.height += freedSpace * ratio;
        });
      }

      panel.isExpanded = false;
    },
    [getCollapsedHeight],
  );

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

  const value = useMemo(
    () => ({ register, unregister, resize, setExpanded }),
    [register, unregister, resize, setExpanded],
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
      const newContainerHeight = container.offsetHeight;

      // Sort panels by order for consistent processing
      const panels = Array.from(panelsRef.current.values()).sort((a, b) => a.order - b.order);

      // Convert to PanelResizeInfo for pure calculation
      const panelInfos = panels.map((p) => ({
        id: p.id,
        height: p.height,
        minHeight: p.minHeight,
        collapsedHeight: getCollapsedHeight(p),
        isExpanded: p.isExpanded,
      }));

      const result = calculateContainerResize(panelInfos, newContainerHeight);

      if (result.changed) {
        // Apply the calculated heights
        result.newHeights.forEach((height, id) => {
          const panel = panelsRef.current.get(id);
          if (panel?.isExpanded) {
            panel.height = height;
          }
        });
        updateGridTemplate();
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateGridTemplate, getCollapsedHeight]);

  // No spacer needed - panels stack naturally in order

  return (
    <div className="expansion-panels" ref={containerRef}>
      <ExpansionContext.Provider value={value}>{children}</ExpansionContext.Provider>
    </div>
  );
};
