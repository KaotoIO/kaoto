import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { CanvasDefaults } from './canvas.defaults';

/** Resolve the full topology ID so identical step paths in different routes stay distinct. */
export const findCanvasNodeById = (id: string): HTMLElement | undefined => {
  const canvas = document.getElementById(CanvasDefaults.CANVAS_MAIN_ID);
  return Array.from(
    canvas?.querySelectorAll<HTMLElement>('g.custom-node, g.placeholder-node, g.custom-group') ?? [],
  ).find((node) => node.closest<SVGElement>('[data-id]')?.dataset.id === id);
};

interface CanvasFocusManager {
  request: () => void;
  clear: () => void;
  restore: (target: HTMLElement) => void;
}

/** Carries a pending focus handoff across the populated and empty canvas views. */
export const CanvasFocusContext = createContext<CanvasFocusManager | undefined>(undefined);

export const useCanvasFocusManager = (): CanvasFocusManager => {
  const pendingFocus = useRef(false);
  useEffect(() => {
    // A new focus destination supersedes the handoff, even if it is blurred or removed before restoration.
    const cancelPendingFocus = () => {
      pendingFocus.current = false;
    };
    document.addEventListener('focusin', cancelPendingFocus);
    return () => {
      document.removeEventListener('focusin', cancelPendingFocus);
    };
  }, []);
  return useMemo(
    () => ({
      request: () => {
        pendingFocus.current = true;
      },
      clear: () => {
        pendingFocus.current = false;
      },
      restore: (target: HTMLElement) => {
        if (!pendingFocus.current) return;
        if (document.activeElement === document.body) target.focus({ preventScroll: true });
        // Keep the request if the target is not focusable yet; respect focus moved elsewhere.
        if (document.activeElement !== document.body) pendingFocus.current = false;
      },
    }),
    [],
  );
};

export const useCanvasFocusRef = (isReady = true) => {
  const focusManager = useContext(CanvasFocusContext);
  const current = useRef<HTMLDivElement | null>(null);
  return useCallback(
    (node: HTMLDivElement | null) => {
      if (!node && current.current?.contains(document.activeElement)) focusManager?.request();
      current.current = node;
      if (node && isReady) focusManager?.restore(node);
    },
    [focusManager, isReady],
  );
};
