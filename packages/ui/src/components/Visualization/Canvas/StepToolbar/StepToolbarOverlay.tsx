import { ComponentProps, Ref, useLayoutEffect, useRef, useState } from 'react';

import { CanvasDefaults } from '../canvas.defaults';
import { StepToolbar } from './StepToolbar';

interface StepToolbarOverlayProps extends Omit<ComponentProps<typeof StepToolbar>, 'toolbarRef'> {
  centerX: number;
  bottomY: number;
  foreignObjectRef?: Ref<SVGForeignObjectElement>;
}

const PAINT_PADDING = 24;
const TOOLBAR_GAP = 6;

/** Keep the complete toolbar and its shadow inside WebKit's SVG repaint bounds. */
export const StepToolbarOverlay = ({
  centerX,
  bottomY,
  foreignObjectRef,
  className,
  ...toolbarProps
}: StepToolbarOverlayProps) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({
    width: CanvasDefaults.STEP_TOOLBAR_WIDTH,
    height: CanvasDefaults.STEP_TOOLBAR_HEIGHT,
  });

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const updateSize = (width: number, height: number) => {
      if (width > 0 && height > 0) {
        setSize((previous) => (previous.width === width && previous.height === height ? previous : { width, height }));
      }
    };
    // Correct position and clipping before first paint, in CSS pixels independent of canvas zoom.
    updateSize(toolbar.offsetWidth, toolbar.offsetHeight);
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;

      const borderBox = entry.borderBoxSize?.[0];
      updateSize(borderBox?.inlineSize ?? toolbar.offsetWidth, borderBox?.blockSize ?? toolbar.offsetHeight);
    });
    observer.observe(toolbar, { box: 'border-box' });
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <foreignObject
      ref={foreignObjectRef}
      className={className}
      x={centerX - size.width / 2 - PAINT_PADDING}
      y={bottomY - TOOLBAR_GAP - size.height - PAINT_PADDING}
      width={size.width + 2 * PAINT_PADDING}
      height={size.height + 2 * PAINT_PADDING}
      style={{ overflow: 'hidden', pointerEvents: 'none' }}
    >
      <div style={{ padding: PAINT_PADDING, width: 'max-content' }}>
        <StepToolbar {...toolbarProps} toolbarRef={toolbarRef} />
      </div>
    </foreignObject>
  );
};
