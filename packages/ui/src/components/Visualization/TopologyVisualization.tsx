import { FunctionComponent, ReactNode, useEffect, useMemo, useState } from 'react';

import { useVisibleVizNodes } from '../../hooks/use-visible-viz-nodes';
import { BaseVisualEntity, IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { Canvas, CanvasEdge, CanvasNode } from './Canvas';
import { CanvasDefaults } from './Canvas/canvas.defaults';
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

  /**
   * The diagram drawn last, tagged with the viz nodes it was built from. Until the diagram for the current viz nodes
   * is built, the canvas keeps the previous one and stays gated as resolving: drawing an empty model in between would
   * flash the empty state and rebuild the graph, losing the zoom, the pan and the focused node.
   */
  const [diagram, setDiagram] = useState<{
    source: IVisualizationNode[] | undefined;
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  }>({ source: undefined, nodes: [], edges: [] });

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
        // Keep the previous diagram, but stop waiting for this one
        if (!cancelled) {
          setDiagram((previous) => ({ ...previous, source: vizNodes }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [vizNodes, isResolving]);

  const isDiagramPending = isResolving || diagram.source !== vizNodes;
  const { nodes, edges } = diagram;
  const isEmpty = !isDiagramPending && nodes.length === 0 && edges.length === 0;

  return (
    <VisualizationShell className={className} fallback={fallback}>
      <Canvas
        contextToolbar={contextToolbar}
        nodes={nodes}
        edges={edges}
        isModelResolving={isDiagramPending}
        describedBy={isEmpty ? CanvasDefaults.EMPTY_STATE_TITLE_ID : undefined}
      />
      {isEmpty && <EmptyCanvas entitiesNumber={0} />}
    </VisualizationShell>
  );
};
