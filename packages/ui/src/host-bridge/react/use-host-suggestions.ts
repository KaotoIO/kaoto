import { useMemo } from 'react';

import { BridgeError, SuggestionDto } from '../contracts';
import { useHostBus } from './context';

export function useHostSuggestions() {
  const bus = useHostBus();
  return useMemo(
    () => ({
      getSuggestions: async (
        topic: string,
        word: string,
        context?: Record<string, string | undefined>,
      ): Promise<SuggestionDto[]> => {
        try {
          const response = await bus.request('editor:suggestions:get', {
            topic,
            word,
            context: Object.fromEntries(Object.entries(context ?? {}).filter(([, v]) => v !== undefined)) as Record<
              string,
              string
            >,
          });
          return response.suggestions;
        } catch (error) {
          if (error instanceof BridgeError && error.code === 'UNSUPPORTED_REQUEST') return [];
          throw error;
        }
      },
    }),
    [bus],
  );
}
