import { FunctionComponent, ReactNode, useEffect, useMemo, useState } from 'react';

import { useVisibleVizNodes } from '../../hooks/use-visible-viz-nodes';
import { BaseVisualEntity, IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { Canvas, CanvasEdge, CanvasNode } from './Canvas';
import { EmptyCanvas } from './Canvas/EmptyCanvas';
import { FlowService } from './Canvas/flow.service';
import { VisualizationShell } from './VisualizationShell';

interface TopologyVisualizationProps {
  className?: string;
  entities: BaseVisualEntity[];
  fallback?: ReactNode;
  contextToolbar?: ReactNode;
}

export const TopologyVisualization: FunctionComponent<TopologyVisualizationProps> = ({
  className,
  entities,
  fallback,
  contextToolbar,
}) => {
  const allFlowsVisible = useMemo(
    () => entities.reduce<Record<string, boolean>>((acc, entity) => ({ ...acc, [entity.id]: true }), {}),
    [entities],
  );
  const { vizNodes, isResolving } = useVisibleVizNodes(entities, allFlowsVisible);

  /** The diagram that is drawn, and the nodes it was built from: it stays in place until the next one is built */
  const [diagram, setDiagram] = useState<{
    source?: IVisualizationNode[];
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  }>({ nodes: [], edges: [] });

  useEffect(() => {
    if (isResolving) {
      return;
    }

    let cancelled = false;

    FlowService.getTopologyFlowDiagram(vizNodes)
      .then((model) => {
        if (!cancelled) {
          setDiagram({ source: vizNodes, ...model });
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to build topology diagram', err);
        if (!cancelled) {
          setDiagram({ source: vizNodes, nodes: [], edges: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [vizNodes, isResolving]);

  const { nodes, edges } = diagram;
  /** The model is not settled until the diagram of the current nodes is built as well */
  const isModelResolving = isResolving || diagram.source !== vizNodes;
  /* There is no empty state before the first diagram is built */
  const isEmpty = diagram.source !== undefined && nodes.length === 0 && edges.length === 0;

  return (
    <VisualizationShell className={className} fallback={fallback}>
      <Canvas contextToolbar={contextToolbar} nodes={nodes} edges={edges} isModelResolving={isModelResolving}>
        {isEmpty && <EmptyCanvas entitiesNumber={0} />}
      </Canvas>
    </VisualizationShell>
  );
};
