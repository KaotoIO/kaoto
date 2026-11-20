import { CanvasDefaults } from './canvas.defaults';

/**
 * The element that has the focus, to give it back once a menu or dialog closes, or `null` when nothing has it.
 *
 * PatternFly only gives the focus back to HTML elements, so the canvas keeps the origin itself to cover its SVG steps.
 */
export const getFocusOrigin = (): Element | null => {
  const { activeElement } = document;
  return activeElement && activeElement !== document.body ? activeElement : null;
};

/**
 * Focuses an HTML or SVG element without scrolling it into view; `Element` itself has no `focus()`.
 *
 * @param element element to focus, nothing happens when it is missing
 */
export const focusElement = (element: Element | null | undefined): void => {
  (element as HTMLOrSVGElement | null | undefined)?.focus({ preventScroll: true });
};

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

    focusElement(
      origin?.isConnected && origin !== document.body ? origin : document.getElementById(CanvasDefaults.CANVAS_MAIN_ID),
    );
  });
};
