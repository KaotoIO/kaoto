import { useEffect, useState } from 'react';

import { getProcessorIconTooltipRequest } from '../models/visualization/flows/nodes/resolvers/tooltip-resolver/getProcessorIconTooltipRequest';

export const useProcessorTooltips = (processorNames: readonly string[]) => {
  const [tooltips, setTooltips] = useState<Record<string, string>>({});

  // Create a stable key from array contents to prevent unnecessary re-fetches
  // when the array reference changes but contents remain the same
  const processorKey = processorNames.join(',');

  useEffect(() => {
    let cancelled = false;

    const fetchTooltips = async () => {
      const results: Record<string, string> = {};

      const settledResults = await Promise.allSettled(
        processorNames.map((name) => getProcessorIconTooltipRequest(name)),
      );

      settledResults.forEach((result, index) => {
        const name = processorNames[index];
        if (result.status === 'fulfilled') {
          results[name] = result.value;
        } else {
          console.warn(`Failed to fetch tooltip for processor "${name}":`, result.reason);
          results[name] = '';
        }
      });

      if (!cancelled) {
        setTooltips(results);
      }
    };

    fetchTooltips();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processorKey]);

  return tooltips;
};
