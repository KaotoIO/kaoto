import { useEffect, useState } from 'react';

import { BaseVisualEntity, IVisualizationNode } from '../models/visualization/base-visual-entity';
import { IVisibleFlows } from '../utils/init-visible-flows';

type ResolvedVisibleVizNodes = {
  entities: BaseVisualEntity[];
  visibleFlows: IVisibleFlows;
  vizNodes: IVisualizationNode[];
};

export type UseVisibleVizNodesResult = {
  vizNodes: IVisualizationNode[];
  /** True while `toVizNode()` work for the current entities/visibleFlows pass is still in flight. */
  isResolving: boolean;
};

/**
 * Builds the list of root visualization nodes for entities that are currently visible in the canvas.
 * Re-resolves when `entities` or `visibleFlows` change; stale async results are ignored after unmount or dependency change.
 *
 * `isResolving` is derived by comparing the current inputs to the last completed resolution, so it
 * flips true on the same render the inputs change (no one-frame stale "settled" paint).
 */
export function useVisibleVizNodes(
  entities: BaseVisualEntity[],
  visibleFlows: IVisibleFlows,
): UseVisibleVizNodesResult {
  const [resolved, setResolved] = useState<ResolvedVisibleVizNodes | null>(null);

  const isResolving = resolved === null || resolved.entities !== entities || resolved.visibleFlows !== visibleFlows;

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const nodes: IVisualizationNode[] = [];
      for (const entity of entities) {
        if (visibleFlows[entity.id]) {
          const vizNode = await entity.toVizNode();
          nodes.push(vizNode);
        }
      }
      if (!cancelled) {
        setResolved({ entities, visibleFlows, vizNodes: nodes });
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [entities, visibleFlows]);

  return {
    vizNodes: isResolving ? [] : (resolved?.vizNodes ?? []),
    isResolving,
  };
}
