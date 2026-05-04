import { FunctionComponent, ReactNode, useEffect, useMemo, useState } from 'react';

import { useVisibleVizNodes } from '../../hooks/use-visible-viz-nodes';
import { BaseVisualEntity } from '../../models/visualization/base-visual-entity';
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

  const [canvasModel, setCanvasModel] = useState<{ nodes: CanvasNode[]; edges: CanvasEdge[] }>({
    nodes: [],
    edges: [],
  });

  useEffect(() => {
    if (isResolving) {
      setCanvasModel({ nodes: [], edges: [] });
      return;
    }

    let cancelled = false;

    FlowService.getTopologyFlowDiagram(vizNodes)
      .then((model) => {
        if (!cancelled) {
          setCanvasModel(model);
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to build topology diagram', err);
      });

    return () => {
      cancelled = true;
    };
  }, [vizNodes, isResolving]);

  const { nodes, edges } = canvasModel;
  const isEmpty = useMemo(() => nodes.length === 0 && edges.length === 0, [nodes, edges]);

  return (
    <VisualizationShell className={className} fallback={fallback}>
      {!isEmpty && (
        <Canvas contextToolbar={contextToolbar} nodes={nodes} edges={edges} isModelResolving={isResolving} />
      )}
      {isEmpty && <EmptyCanvas entitiesNumber={0} isModelResolving={isResolving} contextToolbar={contextToolbar} />}
    </VisualizationShell>
  );
};
