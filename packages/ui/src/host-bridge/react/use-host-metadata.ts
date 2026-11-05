import { useMemo } from 'react';

import { toJsonValue } from '../contracts';
import { useHostBus } from './context';

export function useHostMetadata() {
  const bus = useHostBus();
  return useMemo(
    () => ({
      getMetadata: async <T>(key: string): Promise<T | undefined> => {
        const { value } = await bus.request('editor:metadata:get', { key });
        return value === null ? undefined : (value as T);
      },
      setMetadata: async <T>(key: string, value: T): Promise<void> => {
        await bus.request('editor:metadata:set', { key, value: toJsonValue(value) });
      },
    }),
    [bus],
  );
}
