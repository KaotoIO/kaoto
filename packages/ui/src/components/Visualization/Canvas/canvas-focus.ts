import { CanvasDefaults } from './canvas.defaults';

/**
 * Moves the focus once the next frame is rendered, unless it already sits on an element that is still on the page.
 * Actions that remove the element they were triggered from, like the buttons of the empty state, would otherwise
 * leave the focus on the document body.
 *
 * @param origin element to focus, falling back to the canvas when it is missing or no longer on the page
 */
export const focusCanvasAfterRender = (origin?: Element | null): void => {
  requestAnimationFrame(() => {
    const { activeElement } = document;
    if (activeElement?.isConnected && activeElement !== document.body) {
      return;
    }

    const target =
      origin?.isConnected && origin !== document.body ? origin : document.getElementById(CanvasDefaults.CANVAS_MAIN_ID);
    (target as HTMLOrSVGElement | null)?.focus({ preventScroll: true });
  });
};
