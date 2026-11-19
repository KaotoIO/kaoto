import { MouseEvent as ReactMouseEvent, useCallback, useLayoutEffect, useRef, useState } from 'react';

interface PanelResizerOptions {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
}

/** Tracks the width in pixels of a panel that is resized by dragging its handle, clamped between minWidth and maxWidth */
export function usePanelResizer({ initialWidth, minWidth, maxWidth }: PanelResizerOptions) {
  const [width, setWidth] = useState(initialWidth);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(initialWidth);
  // widthRef mirrors the width state so handleResizerMouseDown can read the
  // current value in a mousedown handler without taking width as a dependency
  // (which would recreate the callback on every mousemove during a drag).
  const widthRef = useRef<number>(initialWidth);
  useLayoutEffect(() => {
    widthRef.current = width;
  });

  const handleResizerMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      startX.current = e.clientX;
      startWidth.current = widthRef.current;

      const onMouseMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX.current;
        setWidth(Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta)));
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [minWidth, maxWidth],
  );

  return { width, handleResizerMouseDown };
}
