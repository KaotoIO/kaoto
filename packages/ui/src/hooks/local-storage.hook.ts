import { useEffect, useState } from 'react';

export const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);

      if (storedValue === null) {
        return defaultValue;
      } else if (typeof defaultValue === 'string') {
        return storedValue;
      }

      const returnValue = JSON.parse(storedValue);
      return returnValue;
    } catch (error) {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, valueToStore);
    } catch {
      // Keep the in-memory state usable when browser storage is unavailable or full.
    }
  }, [key, value]);

  return [value, setValue] as const;
};
