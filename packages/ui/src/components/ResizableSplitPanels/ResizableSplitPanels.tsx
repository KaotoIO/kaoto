import './ResizableSplitPanels.scss';

import { ArrowsHorizontal } from '@carbon/icons-react';
import { FunctionComponent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SplitPanel } from './SplitPanel';

export interface ResizableSplitPanelsProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  defaultLeftWidth?: number;
  onResizeStart?: () => void;
  onResize?: (leftWidth: number, rightWidth: number) => void;
  onResizeEnd?: (leftWidth: number, rightWidth: number) => void;
  /** Custom ID for the left panel (default: 'left-panel') */
  leftPanelId?: string;
  /** Custom ID for the right panel (default: 'right-panel') */
  rightPanelId?: string;
  /** Custom aria-label for the left panel (default: 'Left panel') */
  leftPanelLabel?: string;
  /** Custom aria-label for the right panel (default: 'Right panel') */
  rightPanelLabel?: string;
}

const MIN_PANEL_WIDTH = 10;
const KEYBOARD_STEP_SMALL = 5; // 5% increment for arrow keys
const KEYBOARD_STEP_LARGE = 10; // 10% increment for Shift+arrow keys
const ANNOUNCEMENT_THRESHOLD = 5; // Announce to screen readers every 5% change

// Keyboard key constants for type safety
const KEYS = {
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  ESCAPE: 'Escape',
  ENTER: 'Enter',
} as const;

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
  leftPanelId = 'left-panel',
  rightPanelId = 'right-panel',
  leftPanelLabel = 'Left panel',
  rightPanelLabel = 'Right panel',
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isKeyboardResizing, setIsKeyboardResizing] = useState(false);
  const [lastAnnouncedWidth, setLastAnnouncedWidth] = useState<number>(defaultLeftWidth);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const startXRef = useRef<number>(0);
  const startLeftWidthRef = useRef<number>(defaultLeftWidth);
  const savedWidthRef = useRef<number>(defaultLeftWidth);

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

  // Keyboard resize handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!containerRef.current || !handleRef.current) return;

      const currentGapPercent = getGapPercent(containerRef.current, handleRef.current);
      const maxLeftWidth = 100 - currentGapPercent - MIN_PANEL_WIDTH;
      let newLeftWidth = leftWidth;
      let shouldUpdate = false;

      // Determine step size based on modifier key
      const step = e.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP_SMALL;

      switch (e.key) {
        case KEYS.ARROW_LEFT:
          e.preventDefault();
          newLeftWidth = Math.max(MIN_PANEL_WIDTH, leftWidth - step);
          shouldUpdate = true;
          break;

        case KEYS.ARROW_RIGHT:
          e.preventDefault();
          newLeftWidth = Math.min(maxLeftWidth, leftWidth + step);
          shouldUpdate = true;
          break;

        case KEYS.HOME:
          e.preventDefault();
          newLeftWidth = MIN_PANEL_WIDTH;
          shouldUpdate = true;
          break;

        case KEYS.END:
          e.preventDefault();
          newLeftWidth = maxLeftWidth;
          shouldUpdate = true;
          break;

        case KEYS.ESCAPE:
          e.preventDefault();
          if (isKeyboardResizing) {
            // Restore saved width
            newLeftWidth = savedWidthRef.current;
            shouldUpdate = true;
            setIsKeyboardResizing(false);
            const restoredRightWidth = 100 - savedWidthRef.current - currentGapPercent;
            onResizeEnd?.(savedWidthRef.current, restoredRightWidth);
          }
          break;

        default:
          return;
      }

      if (shouldUpdate && newLeftWidth !== leftWidth) {
        // Start keyboard resize mode on first key press
        if (!isKeyboardResizing && e.key !== KEYS.ESCAPE) {
          setIsKeyboardResizing(true);
          savedWidthRef.current = leftWidth;
          onResizeStart?.();
        }

        setLeftWidth(newLeftWidth);
        const newRightWidth = 100 - newLeftWidth - currentGapPercent;
        onResize?.(newLeftWidth, newRightWidth);

        // Announce to screen readers if change is significant
        if (Math.abs(newLeftWidth - lastAnnouncedWidth) >= ANNOUNCEMENT_THRESHOLD) {
          setLastAnnouncedWidth(newLeftWidth);
        }
      }
    },
    [leftWidth, isKeyboardResizing, lastAnnouncedWidth, onResizeStart, onResize, onResizeEnd],
  );

  // Handle keyboard resize end when focus leaves or Enter is pressed
  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!containerRef.current || !handleRef.current) return;

      if (e.key === KEYS.ENTER && isKeyboardResizing) {
        e.preventDefault();
        setIsKeyboardResizing(false);
        const currentGapPercent = getGapPercent(containerRef.current, handleRef.current);
        const finalRightWidth = 100 - leftWidth - currentGapPercent;
        onResizeEnd?.(leftWidth, finalRightWidth);
      }
    },
    [isKeyboardResizing, leftWidth, onResizeEnd],
  );

  const handleBlur = useCallback(() => {
    if (!containerRef.current || !handleRef.current) return;

    if (isKeyboardResizing) {
      setIsKeyboardResizing(false);
      const currentGapPercent = getGapPercent(containerRef.current, handleRef.current);
      const finalRightWidth = 100 - leftWidth - currentGapPercent;
      onResizeEnd?.(leftWidth, finalRightWidth);
    }
  }, [isKeyboardResizing, leftWidth, onResizeEnd]);

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

  const ariaValues = useMemo(() => {
    const ariaValueNow = Math.round(leftWidth);
    const ariaValueMin = MIN_PANEL_WIDTH;
    const ariaValueMax = Math.round(100 - MIN_PANEL_WIDTH - gapPercent);
    const ariaValueText = `Left panel ${Math.round(leftWidth)}%, right panel ${Math.round(rightWidth)}%`;

    return { ariaValueNow, ariaValueMin, ariaValueMax, ariaValueText };
  }, [leftWidth, rightWidth, gapPercent]);

  return (
    <div
      className="resizable-split-panels"
      ref={containerRef}
      data-resizing={isResizing || isKeyboardResizing || undefined}
    >
      <SplitPanel width={leftWidth} position="left" id={leftPanelId} ariaLabel={leftPanelLabel}>
        {leftPanel}
      </SplitPanel>

      <button
        ref={handleRef}
        type="button"
        className="resize-handle"
        aria-label="Resize panels"
        role="slider"
        aria-orientation="vertical"
        aria-controls={`${leftPanelId} ${rightPanelId}`}
        aria-valuenow={ariaValues.ariaValueNow}
        aria-valuemin={ariaValues.ariaValueMin}
        aria-valuemax={ariaValues.ariaValueMax}
        aria-valuetext={ariaValues.ariaValueText}
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={handleBlur}
      >
        <ArrowsHorizontal size={20} />
      </button>

      <SplitPanel width={rightWidth} position="right" id={rightPanelId} ariaLabel={rightPanelLabel}>
        {rightPanel}
      </SplitPanel>

      {/* Live region for screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="resize-announcement">
        {(isResizing || isKeyboardResizing) && ariaValues.ariaValueText}
      </div>
    </div>
  );
};
