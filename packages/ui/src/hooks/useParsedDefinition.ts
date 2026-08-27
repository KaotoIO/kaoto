import { useEffect, useState } from 'react';

import { IVisualizationNode } from '../models/visualization/base-visual-entity';

export function useParsedDefinition(vizNode: IVisualizationNode): Record<string, unknown> | undefined;
export function useParsedDefinition(vizNode: IVisualizationNode | undefined): unknown;
export function useParsedDefinition(vizNode: IVisualizationNode | undefined): unknown {
  const [parsedDefinition, setParsedDefinition] = useState<unknown>(undefined);

  useEffect(() => {
    let cancelled = false;
    setParsedDefinition(undefined);

    if (!vizNode) {
      return () => {
        cancelled = true;
      };
    }

    void vizNode.getParsedDefinition().then((def) => {
      if (!cancelled) setParsedDefinition(def);
    });
    return () => {
      cancelled = true;
    };
  }, [vizNode]);

  return parsedDefinition;
}
