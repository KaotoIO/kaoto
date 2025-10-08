import { useCallback, useMemo } from 'react';

import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';

export const useShowMessage = (vizNode: IVisualizationNode | undefined) => {
  const onShowMessage = useCallback(async () => {
    /** Get message content */
    const message = vizNode?.getMessage();
    if (!message) {
      return {} as Record<string, unknown>;
    }
    return message;
  }, [vizNode]);

  const value = useMemo(
    () => ({
      onShowMessage,
    }),
    [onShowMessage],
  );

  return value;
};
