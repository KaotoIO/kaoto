import './ExpansionPanel.scss';

import {
  FunctionComponent,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { ExpansionContext } from './ExpansionContext';

interface ExpansionPanelProps {
  id?: string;
  summary: ReactNode;
  defaultExpanded?: boolean;
  defaultHeight?: number;
  minHeight?: number;
  onScroll?: () => void;
  /** Called when panel layout changes (expand/collapse or resize) */
  onLayoutChange?: (id: string) => void;
}

export const ExpansionPanel: FunctionComponent<PropsWithChildren<ExpansionPanelProps>> = ({
  id: providedId,
  summary,
  children,
  defaultExpanded = true,
  defaultHeight = 300,
  minHeight = 100,
  onScroll,
  onLayoutChange,
}) => {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const context = useContext(ExpansionContext);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isResizing, setIsResizing] = useState(false);
  const resizeDataRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const prevDefaultExpanded = useRef(defaultExpanded);

  // RAF loop for mapping line updates during resize (synced with browser rendering)
  const rafRef = useRef<number | null>(null);
  const isResizingRef = useRef(false);
  const onLayoutChangeRef = useRef(onLayoutChange);
  onLayoutChangeRef.current = onLayoutChange;

  const updateMappingLoop = useCallback(() => {
    if (!isResizingRef.current) return;
    onLayoutChangeRef.current?.(id);
    rafRef.current = requestAnimationFrame(updateMappingLoop);
  }, [id]);

  const startMappingUpdates = useCallback(() => {
    isResizingRef.current = true;
    rafRef.current = requestAnimationFrame(updateMappingLoop);
  }, [updateMappingLoop]);

  const stopMappingUpdates = useCallback(() => {
    isResizingRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMappingUpdates();
    };
  }, [stopMappingUpdates]);

  // Update expansion state when defaultExpanded prop changes (not on initial mount)
  useEffect(() => {
    if (prevDefaultExpanded.current !== defaultExpanded) {
      setIsExpanded(defaultExpanded);
      context.setExpanded(id, defaultExpanded);
      prevDefaultExpanded.current = defaultExpanded;
    }
  }, [defaultExpanded, context, id]);

  const toggleExpanded = () => {
    // Don't allow expansion if there are no children
    if (!children) return;

    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    context.setExpanded(id, newExpanded);

    // Notify after CSS transition completes (150ms animation + buffer)
    // This triggers reloadNodeReferences() to update the node reference map
    setTimeout(() => {
      onLayoutChange?.(id);
    }, 160);
  };

  // Use refs for stable event handlers that don't change during resize
  const mouseMoveHandlerRef = useRef<(e: MouseEvent) => void>(() => {});
  const mouseUpHandlerRef = useRef<() => void>(() => {});

  // Stable handlers that delegate to refs - these never change
  const stableMouseMoveHandler = useCallback((e: MouseEvent) => {
    mouseMoveHandlerRef.current(e);
  }, []);

  const stableMouseUpHandler = useCallback(() => {
    mouseUpHandlerRef.current();
  }, []);

  // Update the ref implementations (runs every render, but doesn't cause re-bindings)
  // Resize happens immediately on mouse move for responsiveness
  mouseMoveHandlerRef.current = (moveEvent: MouseEvent) => {
    if (!resizeDataRef.current) return;

    const deltaY = moveEvent.clientY - resizeDataRef.current.startY;

    // Body panel uses top handle - invert delta
    const isBodyPanel = id === 'source-body';
    const newHeight = isBodyPanel
      ? resizeDataRef.current.startHeight - deltaY
      : resizeDataRef.current.startHeight + deltaY;

    const constrainedHeight = Math.max(minHeight, newHeight);
    context.resize(id, constrainedHeight, isBodyPanel);
  };

  mouseUpHandlerRef.current = () => {
    setIsResizing(false);
    resizeDataRef.current = null;

    document.removeEventListener('mousemove', stableMouseMoveHandler);
    document.removeEventListener('mouseup', stableMouseUpHandler);

    // Stop the RAF loop
    stopMappingUpdates();

    // Trigger final update
    onLayoutChange?.(id);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!panelRef.current) return;

    setIsResizing(true);
    resizeDataRef.current = {
      startY: e.clientY,
      startHeight: panelRef.current.offsetHeight,
    };

    document.addEventListener('mousemove', stableMouseMoveHandler);
    document.addEventListener('mouseup', stableMouseUpHandler);

    // Start 60fps mapping line updates
    startMappingUpdates();
  };

  // Register with parent on mount, unregister on unmount
  useEffect(() => {
    if (panelRef.current) {
      context.register(id, minHeight, defaultHeight, panelRef.current, defaultExpanded);
    }

    return () => {
      context.unregister(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, context]);
  // CRITICAL: Only id and context in deps - minHeight, defaultHeight, defaultExpanded excluded
  // to prevent infinite unregister/register loops that reset panel state

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', stableMouseMoveHandler);
      document.removeEventListener('mouseup', stableMouseUpHandler);
    };
  }, [stableMouseMoveHandler, stableMouseUpHandler]);

  // Body panel (source-body) shows resize handle at top, others at bottom
  const isBodyPanel = id === 'source-body';
  const showResizeHandle = isExpanded;

  return (
    <div
      className="expansion-panel"
      data-expanded={isExpanded}
      data-resizing={isResizing}
      data-top-handle={isBodyPanel}
      ref={panelRef}
    >
      {isBodyPanel && showResizeHandle && (
        <div
          className="expansion-panel__resize-handle expansion-panel__resize-handle--top"
          onMouseDown={handleMouseDown}
        />
      )}

      <div className="pf-v6-u-box-shadow-sm expansion-panel__summary" onClick={toggleExpanded}>
        {summary}
      </div>

      <div className="expansion-panel__content" onScroll={onScroll}>
        {children}
      </div>

      {!isBodyPanel && showResizeHandle && (
        <div className="expansion-panel__resize-handle" onMouseDown={handleMouseDown} />
      )}
    </div>
  );
};
