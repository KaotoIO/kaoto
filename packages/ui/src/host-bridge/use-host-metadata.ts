import { BridgeError, isJsonValue, type JsonValue } from '@kaoto/editor-api';
import { useMemo } from 'react';

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
        const payload = { key, value: (value ?? null) as JsonValue };
        if (!isJsonValue(payload.value)) throw new BridgeError('INVALID_MESSAGE', 'Metadata must be JSON');
        await bus.request('editor:metadata:set', payload);
      },
    }),
    [bus],
  );
}
