import { useLayoutEffect, useRef } from 'react';

const FADE_DURATION = 150;

/** Keep a visual-only copy: no duplicate controls, focus targets or element IDs. */
const snapshotToolbar = (toolbar: SVGGElement) => {
  const snapshot = toolbar.cloneNode(true) as SVGGElement;
  snapshot.setAttribute('opacity', '1');
  for (const element of [snapshot, ...snapshot.querySelectorAll<SVGElement | HTMLElement>('*')]) {
    element.removeAttribute('id');
    element.removeAttribute('data-testid');
    element.removeAttribute('title');
    element.style.pointerEvents = 'none';
  }
  snapshot.querySelectorAll('foreignObject > div').forEach((element) => {
    element.setAttribute('inert', '');
  });
  return snapshot;
};

/** Fade SVG groups, keeping the HTML inside foreignObject untransformed for Safari. */
export const useToolbarCrossfade = (targetId: string | undefined) => {
  const activeRef = useRef<SVGGElement>(null);
  const outgoingRef = useRef<SVGGElement>(null);
  const previous = useRef<{ id: string; snapshot: SVGGElement } | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    const active = activeRef.current;
    const outgoing = outgoingRef.current;
    if (previous.current?.id !== targetId) {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      outgoing?.replaceChildren();
      if (active && outgoing) {
        const snapshot = previous.current?.snapshot;
        const originOpacity = Number(active.getAttribute('opacity') ?? 1);
        active.setAttribute('opacity', '1');
        if (snapshot && targetId && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          outgoing.replaceChildren(snapshot);
          outgoing.setAttribute('opacity', String(originOpacity));
          active.setAttribute('opacity', '0');
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / FADE_DURATION);
            active.setAttribute('opacity', String(progress));
            outgoing.setAttribute('opacity', String(originOpacity * (1 - progress)));
            if (progress < 1) frame.current = requestAnimationFrame(tick);
            else outgoing.replaceChildren();
          };
          frame.current = requestAnimationFrame(tick);
        }
      }
    }
    previous.current = targetId && active ? { id: targetId, snapshot: snapshotToolbar(active) } : undefined;
  });

  // ResizeObserver measurements and button updates can render only the child toolbar.
  useLayoutEffect(() => {
    const active = activeRef.current;
    if (!active) return;
    const observer = new MutationObserver((mutations) => {
      if (previous.current && mutations.some((mutation) => mutation.target !== active)) {
        previous.current.snapshot = snapshotToolbar(active);
      }
    });
    observer.observe(active, { subtree: true, childList: true, attributes: true, characterData: true });
    return () => {
      observer.disconnect();
    };
  }, [targetId]);

  useLayoutEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return { activeRef, outgoingRef };
};
