import { useLayoutEffect, useRef, useState } from 'react';

/** Animate SVG coordinates, avoiding composited HTML layers inside foreignObject in Safari. */
export const useToolbarPosition = (targetId: string | undefined, centerX: number, bottomY: number) => {
  const [position, setPosition] = useState({ centerX, bottomY });
  const current = useRef(position);
  const previousId = useRef(targetId);

  useLayoutEffect(() => {
    const animate = previousId.current !== undefined && targetId !== undefined && previousId.current !== targetId;
    previousId.current = targetId;
    const destination = { centerX, bottomY };
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = destination;
      setPosition(destination);
      return;
    }

    const origin = current.current;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 150);
      const eased = 1 - (1 - progress) ** 3;
      current.current = {
        centerX: origin.centerX + (centerX - origin.centerX) * eased,
        bottomY: origin.bottomY + (bottomY - origin.bottomY) * eased,
      };
      setPosition(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [targetId, centerX, bottomY]);

  return position;
};
