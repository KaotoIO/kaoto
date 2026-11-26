import { MouseEvent as ReactMouseEvent, RefCallback, useCallback, useRef } from 'react';

interface PanelResizerOptions {
  /** The CSS custom property that holds the width, e.g. `--cs-explorer-inline-size` */
  cssVariable: string;
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
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
 * The width lives only in a CSS variable on the attached element, written while dragging, so that a drag renders
 * nothing in React: whatever needs the width reads the variable in its styles.
 */
export function usePanelResizer({ cssVariable, initialWidth, minWidth, maxWidth }: PanelResizerOptions): PanelResizer {
  const attachedElementRef = useRef<HTMLElement | null>(null);
  const widthRef = useRef(initialWidth);

  const applyWidth = useCallback(
    (width: number) => {
      widthRef.current = width;
      attachedElementRef.current?.style.setProperty(cssVariable, `${width}px`);
    },
    [cssVariable],
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
        applyWidth(Math.min(maxWidth, Math.max(minWidth, startWidth + moveEvent.clientX - startX)));
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [applyWidth, minWidth, maxWidth],
  );

  return { widthVariableElementRef, handleResizerMouseDown };
}
