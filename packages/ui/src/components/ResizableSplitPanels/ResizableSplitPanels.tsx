import './ResizableSplitPanels.scss';

import { ArrowsHorizontal } from '@carbon/icons-react';
import { FunctionComponent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { SplitPanel } from './SplitPanel';

export interface ResizableSplitPanelsProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  defaultLeftWidth?: number;
  onResizeStart?: () => void;
  onResize?: (leftWidth: number, rightWidth: number) => void;
  onResizeEnd?: (leftWidth: number, rightWidth: number) => void;
}

const MIN_PANEL_WIDTH = 10;

/**
 * Calculates the gap percentage from the resize handle element.
 * Measures actual dimensions from CSS (single source of truth).
 * Falls back to 4.2% if elements are not available (SSR or initial render).
 */
const getGapPercent = (container: HTMLElement | null, handle: HTMLElement | null): number => {
  if (!container || !handle) return 4.2;

  const styles = globalThis.getComputedStyle(handle);
  const gapPx =
    (Number.parseFloat(styles.width) || 0) +
    (Number.parseFloat(styles.marginRight) || 0) +
    (Number.parseFloat(styles.marginLeft) || 0) +
    (Number.parseFloat(styles.borderLeftWidth) || 0) +
    (Number.parseFloat(styles.borderRightWidth) || 0);

  return container.offsetWidth > 0 ? (gapPx / container.offsetWidth) * 100 : 0;
};

export const ResizableSplitPanels: FunctionComponent<ResizableSplitPanelsProps> = ({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 30,
  onResizeStart,
  onResize,
  onResizeEnd,
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const startXRef = useRef<number>(0);
  const startLeftWidthRef = useRef<number>(defaultLeftWidth);

  // Calculate gap percentage from actual DOM element (single source of truth from CSS)
  const gapPercent = getGapPercent(containerRef.current, handleRef.current);

  // Calculate right width (total should be 100% including gap)
  const rightWidth = 100 - leftWidth - gapPercent;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startLeftWidthRef.current = leftWidth;
      onResizeStart?.();
    },
    [leftWidth, onResizeStart],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current || !handleRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      const deltaX = e.clientX - startXRef.current;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const currentGapPercent = getGapPercent(containerRef.current, handleRef.current);

      // Clamp the new width to ensure both panels stay within valid range
      const maxLeftWidth = 100 - currentGapPercent - MIN_PANEL_WIDTH;
      const newLeftWidth = Math.max(MIN_PANEL_WIDTH, Math.min(maxLeftWidth, startLeftWidthRef.current + deltaPercent));

      setLeftWidth(newLeftWidth);
      const newRightWidth = 100 - newLeftWidth - currentGapPercent;
      onResize?.(newLeftWidth, newRightWidth);
    },
    [isResizing, onResize],
  );

  const handleMouseUp = useCallback(() => {
    if (isResizing && containerRef.current && handleRef.current) {
      setIsResizing(false);
      const currentGapPercent = getGapPercent(containerRef.current, handleRef.current);
      const finalRightWidth = 100 - leftWidth - currentGapPercent;
      onResizeEnd?.(leftWidth, finalRightWidth);
    }
  }, [isResizing, leftWidth, onResizeEnd]);

  // Add global mouse event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mouseleave', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="resizable-split-panels" ref={containerRef} data-resizing={isResizing || undefined}>
      <SplitPanel width={leftWidth} position="left">
        {leftPanel}
      </SplitPanel>

      <button
        ref={handleRef}
        type="button"
        className="resize-handle"
        aria-label="Drag to resize panels"
        onMouseDown={handleMouseDown}
      >
        <ArrowsHorizontal size={20} />
      </button>

      <SplitPanel width={rightWidth} position="right">
        {rightPanel}
      </SplitPanel>
    </div>
  );
};
