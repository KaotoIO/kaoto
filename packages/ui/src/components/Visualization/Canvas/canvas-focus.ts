import { createContext, useCallback, useContext, useMemo, useRef } from 'react';

interface CanvasFocusManager {
  request: () => void;
  clear: () => void;
  restore: (target: HTMLElement) => void;
}

/** Carries a pending focus handoff across the populated and empty canvas views. */
export const CanvasFocusContext = createContext<CanvasFocusManager | undefined>(undefined);

export const useCanvasFocusManager = (): CanvasFocusManager => {
  const pendingFocus = useRef(false);
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
      if (!node && current.current === document.activeElement) focusManager?.request();
      current.current = node;
      if (node && isReady) focusManager?.restore(node);
    },
    [focusManager, isReady],
  );
};
