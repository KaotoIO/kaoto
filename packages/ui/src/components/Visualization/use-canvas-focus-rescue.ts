import { RefObject, useEffect } from 'react';

import { CanvasDefaults } from './Canvas/canvas.defaults';
import { CANVAS_NODE_SELECTOR, findCanvasNode } from './Canvas/canvas-nodes';

/** The canvas context menus, which PatternFly renders in a popper outside the canvas */
const CANVAS_MENU_SELECTOR = '.pf-topology-context-menu__c-dropdown__menu';

/**
 * Gives the focus back to the canvas when the focused element inside the container, or in one of the canvas context
 * menus, disappears: e.g. a step removed by "Hide all", the menu item that ran it, or an empty state button that goes
 * away once a route exists. The focus goes to the last focused canvas node if it still exists, otherwise to the canvas
 * itself.
 *
 * It reacts to DOM changes rather than `focusout`, because browsers do not agree on firing `focusout` when the focused
 * element is removed. Controls that stay connected keep their focus.
 */
export const useCanvasFocusRescue = (containerRef: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastFocused: Element | null = null;
    let lastNodeId: string | undefined;

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element;
      if (!container.contains(target) && !target.closest?.(CANVAS_MENU_SELECTOR)) {
        lastFocused = null;
        return;
      }
      lastFocused = target;
      if (lastFocused.matches?.(CANVAS_NODE_SELECTOR)) {
        lastNodeId = lastFocused.closest<SVGElement>('[data-id]')?.dataset.id;
      }
    };

    const observer = new MutationObserver(() => {
      if (!lastFocused || lastFocused.isConnected) return;
      const { activeElement } = document;
      if (activeElement && activeElement !== document.body) return;

      lastFocused = null;
      const target =
        (lastNodeId && findCanvasNode(lastNodeId)) || document.getElementById(CanvasDefaults.CANVAS_MAIN_ID);
      (target as HTMLElement | SVGElement | null)?.focus({ preventScroll: true });
    });

    // The menus live outside the container, so the whole document is watched; the callback returns early otherwise
    document.addEventListener('focusin', onFocusIn);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      observer.disconnect();
    };
  }, [containerRef]);
};
