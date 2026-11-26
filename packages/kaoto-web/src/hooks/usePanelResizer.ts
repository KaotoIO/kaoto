import { MouseEvent as ReactMouseEvent, RefCallback, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocalStorage } from 'usehooks-ts';

interface PanelResizerOptions {
  /** The CSS custom property that holds the width, e.g. `--cs-explorer-inline-size` */
  cssVariable: string;
  /** The width when no width is stored */
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  /** The browser storage key that keeps the width across reloads and shares it with the other tabs */
  storageKey: string;
}

interface PanelResizer {
  /**
   * Attach to the element that carries the width variable, e.g. a layout around the panel and the elements that line
   * up with it; it gets the current width as soon as it is attached
   */
  widthVariableElementRef: RefCallback<HTMLElement>;
  /** Starts resizing when the resize handle is pressed */
  handleResizerMouseDown: (event: ReactMouseEvent) => void;
}

/**
 * Resizes a panel by dragging its handle, with the width clamped between minWidth and maxWidth.
 *
 * The width lives in a CSS variable on the attached element, written while dragging, so that a drag renders nothing in
 * React: whatever needs the width reads the variable in its styles. The width is stored once the mouse is released,
 * read synchronously when the hook mounts, and taken over when another tab stores one.
 *
 * A stored width is clamped to the limits; one that is not a number counts as none. While the browser storage is
 * blocked or full, e.g. in a private window, the panel starts at the initial width and keeps the width it is dragged to.
 */
export function usePanelResizer({
  cssVariable,
  initialWidth,
  minWidth,
  maxWidth,
  storageKey,
}: PanelResizerOptions): PanelResizer {
  const clampWidth = useCallback(
    (width: number) => Math.min(maxWidth, Math.max(minWidth, width)),
    [minWidth, maxWidth],
  );
  const storageOptions = useMemo(
    () => ({
      deserializer: (stored: string) => {
        const width = stored.trim() === '' ? Number.NaN : Number(stored);
        return Number.isFinite(width) ? clampWidth(width) : initialWidth;
      },
    }),
    [clampWidth, initialWidth],
  );
  const [storedWidth, setStoredWidth] = useLocalStorage(storageKey, initialWidth, storageOptions);
  const attachedElementRef = useRef<HTMLElement | null>(null);
  const widthRef = useRef(storedWidth);

  const applyWidth = useCallback(
    (width: number) => {
      widthRef.current = width;
      attachedElementRef.current?.style.setProperty(cssVariable, `${width}px`);
    },
    [cssVariable],
  );

  useEffect(
    function applyStoredWidth() {
      applyWidth(storedWidth);
    },
    [storedWidth, applyWidth],
  );

  const widthVariableElementRef = useCallback<RefCallback<HTMLElement>>(
    (element) => {
      attachedElementRef.current = element;
      applyWidth(widthRef.current);
    },
    [applyWidth],
  );

  const handleResizerMouseDown = useCallback(
    (event: ReactMouseEvent) => {
      const startX = event.clientX;
      const startWidth = widthRef.current;

      const onMouseMove = (moveEvent: MouseEvent) => {
        applyWidth(clampWidth(startWidth + moveEvent.clientX - startX));
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        // A click without a change keeps nothing, so that a later change of the initial width still reaches the user
        if (widthRef.current !== startWidth) setStoredWidth(widthRef.current);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [applyWidth, clampWidth, setStoredWidth],
  );

  return { widthVariableElementRef, handleResizerMouseDown };
}
