import './ExpansionPanels.scss';

import React, { FunctionComponent, PropsWithChildren, useCallback, useEffect, useMemo, useRef } from 'react';

import { applyConstrainedResize } from './expansion-utils';
import { ExpansionContext, PanelData } from './ExpansionContext';

// Special panel IDs with fixed ordering
const PARAMETERS_HEADER_ID = 'parameters-header';
const SOURCE_BODY_ID = 'source-body';

// Order constants - ensures consistent panel positioning
const ORDER_FIRST = 0; // Parameters header always first
const ORDER_LAST = 1000; // Source body always last
const ORDER_START = 1; // Starting order for dynamic panels (parameters, inputs, etc.)

export const ExpansionPanels: FunctionComponent<PropsWithChildren> = ({ children }) => {
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
      if (React.isValidElement(child) && child.props?.id) {
        const panel = panelsRef.current.get(child.props.id);
        if (panel) {
          // Assign order based on panel ID
          if (child.props.id === PARAMETERS_HEADER_ID) {
            panel.order = ORDER_FIRST;
          } else if (child.props.id === SOURCE_BODY_ID) {
            panel.order = ORDER_LAST;
          } else {
            // Dynamic panels get sequential order based on JSX position
            panel.order = dynamicOrder++;
          }
        }
      }
    });
  }, []); // No dependencies - uses childrenRef to avoid cascade

  const updateGridTemplate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Sort panels by order field to maintain stable layout
    const panels = Array.from(panelsRef.current.values()).sort((a, b) => a.order - b.order);
    if (panels.length === 0) return;

    // Create grid template from panel heights (use collapsed height for collapsed panels)
    // Insert flexible space (1fr) before the Body panel ONLY to push it to the bottom
    const templateParts: string[] = [];

    panels.forEach((panel) => {
      // Add flexible spacer (1fr) ONLY before the source-body panel
      if (panel.id === SOURCE_BODY_ID) {
        templateParts.push('1fr');
      }

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
    (id: string, newHeight: number, isTopHandle: boolean = false) => {
      const container = containerRef.current;
      if (!container) return;

      // Sort panels by order to find adjacent panels correctly
      const panels = Array.from(panelsRef.current.entries()).sort(([, a], [, b]) => a.order - b.order);
      const currentIdx = panels.findIndex(([panelId]) => panelId === id);

      if (currentIdx === -1) return;

      const [, current] = panels[currentIdx];

      // Only allow resizing if current panel is expanded
      if (!current.isExpanded) return;

      if (isTopHandle) {
        // Top handle (Body panel) - resizes against panel ABOVE
        // The inversion is already handled in ExpansionPanel.tsx mouseMoveHandler
        if (currentIdx === 0) return; // No panel above

        const [, prev] = panels[currentIdx - 1];
        const prevCollapsedHeight = getCollapsedHeight(prev);
        applyConstrainedResize(current, prev, newHeight, prevCollapsedHeight);
      } else {
        // Bottom handle (normal panels) - resizes against panel BELOW
        if (currentIdx === panels.length - 1) return;

        const [, next] = panels[currentIdx + 1];
        const nextCollapsedHeight = getCollapsedHeight(next);
        applyConstrainedResize(current, next, newHeight, nextCollapsedHeight);
      }

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
      const totalHeight = container.offsetHeight;
      // Sort panels by order for consistent processing
      const panels = Array.from(panelsRef.current.values()).sort((a, b) => a.order - b.order);

      if (panels.length === 0) return;

      // Calculate total current height (use collapsed height for collapsed panels)
      const currentTotal = panels.reduce((sum, panel) => {
        return sum + (panel.isExpanded ? panel.height : getCollapsedHeight(panel));
      }, 0);

      // If there's a difference, distribute it proportionally
      if (currentTotal !== totalHeight && totalHeight > 0) {
        const collapsedPanels = panels.filter((p) => !p.isExpanded);
        const expandedPanels = panels.filter((p) => p.isExpanded);

        if (expandedPanels.length > 0) {
          // Calculate available space for expanded panels
          const collapsedSpace = calculateCollapsedSpace(collapsedPanels);
          const availableSpace = totalHeight - collapsedSpace;

          // Resize expanded panels proportionally
          const currentExpandedTotal = expandedPanels.reduce((sum, p) => sum + p.height, 0);
          const ratio = availableSpace / currentExpandedTotal;

          expandedPanels.forEach((panel) => {
            panel.height = Math.max(panel.minHeight, panel.height * ratio);
          });

          // Recalculate to ensure exact fit
          const newExpandedTotal = expandedPanels.reduce((sum, p) => sum + p.height, 0);
          const diff = availableSpace - newExpandedTotal;

          // Give remaining pixels to the last EXPANDED panel
          if (diff !== 0) {
            const lastExpandedPanel = [...expandedPanels].reverse()[0];
            if (lastExpandedPanel) {
              lastExpandedPanel.height += diff;
            }
          }
        }

        updateGridTemplate();
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateGridTemplate, getCollapsedHeight, calculateCollapsedSpace]);

  // Insert a spacer div before the Body panel ONLY to push it to the bottom
  const childrenArray = React.Children.toArray(children);
  const bodyIndex = childrenArray.findIndex(
    (child) => React.isValidElement(child) && child.props?.id === SOURCE_BODY_ID,
  );

  // Only add spacer if Body panel exists and is not the first child
  const renderedChildren =
    bodyIndex > 0
      ? [
          ...childrenArray.slice(0, bodyIndex),
          <div key="expansion-spacer" className="expansion-panels__spacer" data-is-spacer="true" />,
          ...childrenArray.slice(bodyIndex),
        ]
      : children;

  return (
    <div className="expansion-panels" ref={containerRef}>
      <ExpansionContext.Provider value={value}>{renderedChildren}</ExpansionContext.Provider>
    </div>
  );
};
