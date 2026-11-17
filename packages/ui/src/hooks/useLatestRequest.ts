import { useCallback, useEffect, useRef } from 'react';

/**
 * Tells an async load whether it is still the one the user is waiting for.
 * `start` returns a check that turns false when a newer load starts or the component unmounts.
 */
export const useLatestRequest = () => {
  const latestRequest = useRef(0);

  useEffect(
    () => () => {
      latestRequest.current += 1;
    },
    [],
  );

  return useCallback(() => {
    latestRequest.current += 1;
    const request = latestRequest.current;
    return () => request === latestRequest.current;
  }, []);
};
