import { useCallback, useRef } from 'react';

import { useLocalStorage } from '../../../hooks';
import { LocalStorageKeys } from '../../../models/local-storage-keys';

const NAV_MIN_WIDTH = 220;
const DETAILS_MIN_WIDTH = 420;

export const useRestDslResize = () => {
  const [navWidth, setNavWidth] = useLocalStorage(LocalStorageKeys.RestDslNavWidth, 288);
  const resizeRef = useRef<{ startX: number; startWidth: number; isDragging: boolean } | null>(null);

  const handleResizeStart = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      resizeRef.current = {
        startX: event.clientX,
        startWidth: navWidth,
        isDragging: true,
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!resizeRef.current?.isDragging) return;
        const delta = e.clientX - resizeRef.current.startX;
        const newWidth = Math.max(NAV_MIN_WIDTH, resizeRef.current.startWidth + delta);
        const maxWidth = window.innerWidth - DETAILS_MIN_WIDTH;
        setNavWidth(Math.min(newWidth, maxWidth));
      };

      const handleMouseUp = () => {
        if (resizeRef.current) {
          resizeRef.current.isDragging = false;
        }
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [navWidth, setNavWidth],
  );

  return {
    navWidth,
    handleResizeStart,
  };
};
