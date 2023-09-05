import { useState, useEffect } from 'react';

export const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => {
    const storedValue = localStorage.getItem(key);

    if (storedValue === null) {
      return defaultValue;
    } else if (typeof defaultValue === 'string') {
      return storedValue;
    }

    try {
      const returnValue = JSON.parse(storedValue);
      return returnValue;
    } catch (error) {
      return defaultValue;
    }
  });

  useEffect(() => {
    const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, valueToStore);
  }, [key, value]);

  return [value, setValue] as const;
};
