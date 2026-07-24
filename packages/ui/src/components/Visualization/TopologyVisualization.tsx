import { FunctionComponent, ReactNode, useMemo } from 'react';

import { useVisibleVizNodes } from '../../hooks/use-visible-viz-nodes';
import { BaseVisualEntity } from '../../models/visualization/base-visual-entity';
import { Canvas } from './Canvas';
import { EmptyCanvas } from './Canvas/EmptyCanvas';
import { buildTopologyCanvasModel } from './topology-canvas-model';
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

  const { nodes, edges } = useMemo(() => {
    if (isResolving) {
      return { nodes: [], edges: [] };
    }
    return buildTopologyCanvasModel(vizNodes);
  }, [vizNodes, isResolving]);

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
