import { FunctionComponent, PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExpansionContext, PanelData } from './ExpansionContext';
import './ExpansionPanels.scss';

export const ExpansionPanels: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<Map<string, PanelData>>(new Map());
  const [, forceUpdate] = useState({});

  const getCollapsedHeight = useCallback((element: HTMLDivElement): number => {
    // Measure the header height (first child is the summary)
    const header = element.querySelector('.expansion-panel__summary') as HTMLElement;
    const height = header?.offsetHeight ?? 50; // fallback to 50px
    // Ensure we have a valid height
    return height > 0 ? height : 50;
  }, []);

  const updateGridTemplate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const panels = Array.from(panelsRef.current.values());
    if (panels.length === 0) return;

    // Create grid template from panel heights (use collapsed height for collapsed panels)
    const template = panels
      .map((panel) => {
        const height = panel.isExpanded ? panel.height : getCollapsedHeight(panel.element);
        return `${height}px`;
      })
      .join(' ');

    container.style.setProperty('--grid-template', template);
  }, [getCollapsedHeight]);

  const register = useCallback(
    (id: string, minHeight: number, defaultHeight: number, element: HTMLDivElement, isExpanded: boolean) => {
      panelsRef.current.set(id, {
        id,
        height: defaultHeight,
        minHeight,
        element,
        isExpanded,
      });

      // Update grid template after registration
      setTimeout(() => {
        updateGridTemplate();
        forceUpdate({});
      }, 0);
    },
    [updateGridTemplate],
  );

  const unregister = useCallback(
    (id: string) => {
      panelsRef.current.delete(id);
      updateGridTemplate();
    },
    [updateGridTemplate],
  );

  const resize = useCallback(
    (id: string, newHeight: number) => {
      const container = containerRef.current;
      if (!container) return;

      const panels = Array.from(panelsRef.current.entries());
      const currentIdx = panels.findIndex(([panelId]) => panelId === id);

      if (currentIdx === -1 || currentIdx === panels.length - 1) return;

      const [, current] = panels[currentIdx];
      const [, next] = panels[currentIdx + 1];

      // Only resize if both panels are expanded
      if (!current.isExpanded || !next.isExpanded) return;

      // Calculate the delta
      const delta = newHeight - current.height;

      // Constrain the resize based on min heights
      const maxGrow = next.height - next.minHeight;
      const maxShrink = current.height - current.minHeight;

      const actualDelta = delta > 0 ? Math.min(delta, maxGrow) : Math.max(delta, -maxShrink);

      // Apply the constrained changes
      current.height += actualDelta;
      next.height -= actualDelta;

      // Update the grid template
      updateGridTemplate();
    },
    [updateGridTemplate],
  );

  const setExpanded = useCallback(
    (id: string, isExpanded: boolean) => {
      const container = containerRef.current;
      if (!container) return;

      const panel = panelsRef.current.get(id);
      if (!panel) return;

      const wasExpanded = panel.isExpanded;

      // Early return if no state change
      if (wasExpanded === isExpanded) return;

      const panels = Array.from(panelsRef.current.values());
      const totalHeight = container.offsetHeight;

      if (isExpanded && !wasExpanded) {
        // Panel is being expanded
        // Get currently expanded panels (before updating this one)
        const otherExpandedPanels = panels.filter((p) => p.isExpanded && p.id !== id);
        const collapsedPanels = panels.filter((p) => !p.isExpanded && p.id !== id);

        if (otherExpandedPanels.length > 0) {
          // There are other expanded panels - redistribute all space fairly
          const collapsedSpace = collapsedPanels.reduce((sum, p) => sum + getCollapsedHeight(p.element), 0);
          const availableSpace = totalHeight - collapsedSpace;

          // Calculate total minimum height needed for all expanded panels (including this one)
          const totalMinHeight = otherExpandedPanels.reduce((sum, p) => sum + p.minHeight, 0) + panel.minHeight;
          const extraSpace = availableSpace - totalMinHeight;

          if (extraSpace > 0) {
            // Distribute space fairly among all expanded panels based on their current proportions
            const totalCurrentHeight = otherExpandedPanels.reduce((sum, p) => sum + p.height, 0) + panel.height;

            otherExpandedPanels.forEach((p) => {
              const ratio = p.height / totalCurrentHeight;
              p.height = p.minHeight + extraSpace * ratio;
            });

            const panelRatio = panel.height / totalCurrentHeight;
            panel.height = panel.minHeight + extraSpace * panelRatio;
          } else {
            // Not enough space - set all to minimum
            otherExpandedPanels.forEach((p) => {
              p.height = p.minHeight;
            });
            panel.height = panel.minHeight;
          }
        } else {
          // No other expanded panels - recalculate based on available space
          const collapsedSpace = collapsedPanels.reduce((sum, p) => sum + getCollapsedHeight(p.element), 0);
          const availableSpace = totalHeight - collapsedSpace;

          // This panel gets all the available space
          panel.height = Math.max(panel.minHeight, availableSpace);
        }

        // Update state after calculating redistribution
        panel.isExpanded = true;
      } else if (!isExpanded && wasExpanded) {
        // Panel is being collapsed - redistribute its space to other expanded panels
        const collapsedHeight = getCollapsedHeight(panel.element);
        const freedSpace = panel.height - collapsedHeight;

        // Get currently expanded panels (excluding this one that's being collapsed)
        const otherExpandedPanels = panels.filter((p) => p.isExpanded && p.id !== id);

        if (otherExpandedPanels.length > 0) {
          // Distribute freed space proportionally to other expanded panels
          const totalExpandedHeight = otherExpandedPanels.reduce((sum, p) => sum + p.height, 0);

          otherExpandedPanels.forEach((p) => {
            const ratio = p.height / totalExpandedHeight;
            p.height += freedSpace * ratio;
          });
        }

        // Update state after calculating redistribution
        panel.isExpanded = false;
      }

      updateGridTemplate();
    },
    [updateGridTemplate, getCollapsedHeight],
  );

  const value = useMemo(
    () => ({ register, unregister, resize, setExpanded }),
    [register, unregister, resize, setExpanded],
  );

  // Handle container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      const totalHeight = container.offsetHeight;
      const panels = Array.from(panelsRef.current.values());

      if (panels.length === 0) return;

      // Calculate total current height
      const currentTotal = panels.reduce((sum, panel) => sum + panel.height, 0);

      // If there's a difference, distribute it proportionally
      if (currentTotal !== totalHeight && totalHeight > 0) {
        const ratio = totalHeight / currentTotal;
        panels.forEach((panel) => {
          panel.height = Math.max(panel.minHeight, panel.height * ratio);
        });

        // Recalculate to ensure exact fit
        const newTotal = panels.reduce((sum, panel) => sum + panel.height, 0);
        const diff = totalHeight - newTotal;

        // Give remaining pixels to the last panel
        if (panels.length > 0) {
          panels[panels.length - 1].height += diff;
        }

        updateGridTemplate();
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateGridTemplate]);

  return (
    <div className="expansion-panels" ref={containerRef}>
      <ExpansionContext.Provider value={value}>{children}</ExpansionContext.Provider>
    </div>
  );
};
