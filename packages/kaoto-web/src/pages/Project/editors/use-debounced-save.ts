import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

/**
 * Saves edits once typing pauses instead of on every key.
 *
 * Pending content is saved right away when content of another file is scheduled, when the component unmounts and when
 * the page is left, so no edit is lost and none lands in another file.
 */
export const useDebouncedSave = (save: (fileId: string, content: string) => void, delayMs = 300) => {
  const saveRef = useRef(save);
  useLayoutEffect(() => {
    saveRef.current = save;
  }, [save]);

  const pendingRef = useRef<{ fileId: string; content: string }>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flush = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = undefined;
    saveRef.current(pending.fileId, pending.content);
  }, []);

  const schedule = useCallback(
    (fileId: string, content: string) => {
      if (pendingRef.current && pendingRef.current.fileId !== fileId) flush();
      pendingRef.current = { fileId, content };
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, delayMs);
    },
    [flush, delayMs],
  );

  useEffect(() => flush, [flush]);

  // Leaving the page doesn't unmount the editor, so the pending content is saved then as well
  useEffect(() => {
    globalThis.addEventListener('pagehide', flush);
    return () => {
      globalThis.removeEventListener('pagehide', flush);
    };
  }, [flush]);

  return useMemo(() => ({ schedule, flush }), [schedule, flush]);
};
