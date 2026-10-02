import { useMemo } from 'react';
import type { SuggestionDto } from '@kaoto/editor-api';
import { useHostBus } from './context';

export function useHostSuggestions() {
  const bus = useHostBus();
  return useMemo(
    () => ({
      getSuggestions: (
        topic: string,
        word: string,
        context?: Record<string, string>,
      ): Promise<SuggestionDto[]> =>
        bus
          .request('editor:suggestions:get', {
            topic,
            word,
            context: Object.fromEntries(
              Object.entries(context ?? {}).filter(([, v]) => v !== undefined),
            ) as Record<string, string>,
          })
          .then((r) => r.suggestions)
          .catch(() => []),
    }),
    [bus],
  );
}
