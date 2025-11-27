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
}

export const ExpansionPanel: FunctionComponent<PropsWithChildren<ExpansionPanelProps>> = ({
  id: providedId,
  summary,
  children,
  defaultExpanded = true,
  defaultHeight = 300,
  minHeight = 100,
  onScroll,
}) => {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const context = useContext(ExpansionContext);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isResizing, setIsResizing] = useState(false);
  const resizeDataRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const prevDefaultExpanded = useRef(defaultExpanded);

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
  };

  const mouseMoveHandler = useCallback(
    (moveEvent: MouseEvent) => {
      if (!resizeDataRef.current) return;

      const deltaY = moveEvent.clientY - resizeDataRef.current.startY;

      // Body panel uses top handle - invert delta
      // Top handle: drag DOWN = shrink panel, drag UP = grow panel
      const isBodyPanel = id === 'source-body';
      const newHeight = isBodyPanel
        ? resizeDataRef.current.startHeight - deltaY // Inverted for top handle
        : resizeDataRef.current.startHeight + deltaY; // Normal for bottom handle

      const constrainedHeight = Math.max(minHeight, newHeight);
      context.resize(id, constrainedHeight, isBodyPanel);
    },
    [minHeight, context, id],
  );

  const mouseUpHandler = useCallback(() => {
    setIsResizing(false);
    resizeDataRef.current = null;

    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
  }, [mouseMoveHandler]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!panelRef.current) return;

    setIsResizing(true);
    resizeDataRef.current = {
      startY: e.clientY,
      startHeight: panelRef.current.offsetHeight,
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
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
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
  }, [mouseMoveHandler, mouseUpHandler]);

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
