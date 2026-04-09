import { useEffect, useState } from 'react';

import { BaseVisualEntity, IVisualizationNode } from '../models/visualization/base-visual-entity';
import { IVisibleFlows } from '../utils/init-visible-flows';

export type UseVisibleVizNodesResult = {
  vizNodes: IVisualizationNode[];
  /** True while `toVizNode()` work for the current entities/visibleFlows pass is still in flight. */
  isResolving: boolean;
};

/**
 * Builds the list of root visualization nodes for entities that are currently visible in the canvas.
 * Re-resolves when `entities` or `visibleFlows` change; stale async results are ignored after unmount or dependency change.
 */
export function useVisibleVizNodes(
  entities: BaseVisualEntity[],
  visibleFlows: IVisibleFlows,
): UseVisibleVizNodesResult {
  const [vizNodes, setVizNodes] = useState<IVisualizationNode[]>([]);
  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsResolving(true);

    const resolve = async () => {
      const nodes: IVisualizationNode[] = [];
      for (const entity of entities) {
        if (visibleFlows[entity.id]) {
          const vizNode = await entity.toVizNode();
          nodes.push(vizNode);
        }
      }
      if (!cancelled) {
        setVizNodes(nodes);
        setIsResolving(false);
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [entities, visibleFlows]);

  return { vizNodes, isResolving };
}
