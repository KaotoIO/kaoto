import { useLayoutEffect, useRef } from 'react';

import { CanvasDefaults } from '../components/Visualization/Canvas/canvas.defaults';

/**
 * Gives the focus back to the element that had it when a modal opened, once the modal closes.
 *
 * PatternFly's modal does it only for HTML elements, and the canvas steps are SVG elements. The element can also
 * be gone by the time the modal's action runs, like a deleted step, so the canvas takes the focus if nothing else
 * has it on the next animation frame.
 *
 * @param isOpen Whether the modal is open
 */
export const useReturnFocus = (isOpen: boolean) => {
  const origin = useRef<HTMLElement | SVGElement | null>(null);

  /* A layout effect runs before the modal's focus trap, a passive effect, moves the focus into the modal */
  useLayoutEffect(() => {
    if (isOpen) {
      const active = document.activeElement;
      const isElement = active instanceof HTMLElement || active instanceof SVGElement;
      origin.current = isElement && active !== document.body ? active : null;
      return;
    }

    if (origin.current === null) return;

    origin.current.focus({ preventScroll: true });
    origin.current = null;
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) {
        document.getElementById(CanvasDefaults.CANVAS_MAIN_ID)?.focus({ preventScroll: true });
      }
    });
  }, [isOpen]);
};
