import { useMemo } from 'react';

import { RuntimeMavenInformation } from '../../models/runtime-maven-information';
import { BridgeError } from '../contracts';
import { useHostBus } from './context';

export function useHostRuntime() {
  const bus = useHostBus();
  return useMemo(
    () => ({
      getRuntimeInfo: async (): Promise<RuntimeMavenInformation | undefined> => {
        try {
          return (await bus.request('editor:maven:getRuntimeInfo', null)).runtimeInfo ?? undefined;
        } catch (error) {
          if (error instanceof BridgeError && error.code === 'UNSUPPORTED_REQUEST') return undefined;
          throw error;
        }
      },
    }),
    [bus],
  );
}
