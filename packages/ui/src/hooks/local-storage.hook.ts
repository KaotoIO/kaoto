import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';

export const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const [state, setState] = useState<{ value: T; shouldPersist: boolean }>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      let value = defaultValue;

      if (storedValue !== null) {
        value = typeof defaultValue === 'string' ? storedValue : JSON.parse(storedValue);
      }

      return { value, shouldPersist: true };
    } catch {
      return { value: defaultValue, shouldPersist: false };
    }
  });

  const setValue: Dispatch<SetStateAction<T>> = useCallback((update) => {
    setState((previous) => {
      const value = typeof update === 'function' ? (update as (value: T) => T)(previous.value) : update;
      return previous.shouldPersist && Object.is(previous.value, value) ? previous : { value, shouldPersist: true };
    });
  }, []);

  useEffect(() => {
    // A failed read must not replace existing data with the fallback on mount or rerender.
    if (!state.shouldPersist) return;

    try {
      const valueToStore = typeof state.value === 'string' ? state.value : JSON.stringify(state.value);
      localStorage.setItem(key, valueToStore);
    } catch {
      // Keep the in-memory state usable when browser storage is unavailable or full.
    }
  }, [key, state]);

  return [state.value, setValue] as const;
};
