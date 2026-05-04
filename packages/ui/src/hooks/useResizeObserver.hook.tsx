import { RefObject, useEffect } from 'react';

export function useResizeObserver<T extends HTMLElement>(ref: RefObject<T | null>, fn: () => void) {
  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(() => {
      fn();
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, fn]);
}
