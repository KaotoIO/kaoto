import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';

function createFocusHandoff() {
  let pending = false;
  return {
    cancel: () => {
      pending = false;
    },
    register: (element: HTMLDivElement, ready: boolean) => {
      const owner = element.ownerDocument;
      if (pending && ready && element.isConnected) {
        pending = false;
        if (owner.activeElement === owner.body) {
          element.focus({ preventScroll: true });
          // A surface may not be focusable yet; retain the handoff until it is.
          pending = owner.activeElement === owner.body;
        }
      }

      // React runs ref cleanup before removing the focused DOM subtree.
      return () => {
        if (element.contains(owner.activeElement)) pending = true;
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
