import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';

function createFocusHandoff() {
  let pending = false;
  let origin: HTMLElement | SVGElement | null = null;
  let target: { element: HTMLDivElement; ready: boolean } | undefined;
  let frame: number | undefined;

  const cancel = () => {
    pending = false;
    origin = null;
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
  };
  const restore = () => {
    if (!pending || !target?.ready || !target.element.isConnected) return;
    const { element } = target;
    if (element.ownerDocument.activeElement !== element.ownerDocument.body) return;
    const destination = origin?.isConnected && element.contains(origin) ? origin : element;
    cancel();
    destination.focus({ preventScroll: true });
    // A surface may not be focusable yet; retain the handoff until it is.
    pending = element.ownerDocument.activeElement === element.ownerDocument.body;
  };

  return {
    cancel,
    request: (trigger: HTMLElement | SVGElement | null) => {
      cancel();
      pending = true;
      origin = trigger;
      // Menu actions may remove both the portal and the originating canvas in this commit.
      frame = requestAnimationFrame(() => {
        frame = undefined;
        restore();
      });
    },
    register: (element: HTMLDivElement, ready: boolean) => {
      const registration = { element, ready };
      target = registration;
      restore();
      // React runs ref cleanup before removing the focused DOM subtree.
      return () => {
        if (element.contains(element.ownerDocument.activeElement)) pending = true;
        if (target === registration) target = undefined;
      };
    },
  };
}

const CanvasFocusContext = createContext<ReturnType<typeof createFocusHandoff> | undefined>(undefined);

/** Owns focus transfers across the empty and populated views of one visualization. */
export const CanvasFocusProvider = ({ children }: PropsWithChildren) => {
  const [handoff] = useState(createFocusHandoff);
  useEffect(() => {
    // Respect a new focus destination even if it is subsequently blurred or removed.
    document.addEventListener('focusin', handoff.cancel, true);
    return () => {
      document.removeEventListener('focusin', handoff.cancel, true);
      handoff.cancel();
    };
  }, [handoff]);

  return <CanvasFocusContext.Provider value={handoff}>{children}</CanvasFocusContext.Provider>;
};

/** Registers a canvas root and captures its focus before React detaches it. */
export const useCanvasFocusTarget = (isReady: boolean) => {
  const handoff = useContext(CanvasFocusContext);
  return useCallback(
    (element: HTMLDivElement | null) => {
      if (element) return handoff?.register(element, isReady);
    },
    [handoff, isReady],
  );
};

/** Requests focus return after a portaled menu closes, unless another destination takes focus. */
export const useCanvasFocusReturn = () => {
  const handoff = useContext(CanvasFocusContext);
  return useCallback((origin: HTMLElement | SVGElement | null) => handoff?.request(origin), [handoff]);
};
