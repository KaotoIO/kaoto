import { useEffect, useRef } from 'react';

/**
 * Hook that triggers a refresh callback when the window regains focus
 * @param refreshCallback - Function to call when window regains focus
 * @param enabled - Whether the auto-refresh is enabled (default: true)
 */
export const useRefreshOnFocus = (refreshCallback: () => void, enabled = true) => {
  const lastFocusTime = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const handleFocus = () => {
      const now = Date.now();
      const timeSinceLastFocus = now - lastFocusTime.current;

      // Only refresh if more than 5 seconds have passed since last focus
      // This prevents excessive refreshes when quickly switching tabs
      if (timeSinceLastFocus > 5000) {
        refreshCallback();
      }
      lastFocusTime.current = now;
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshCallback, enabled]);
};

// Made with Bob
