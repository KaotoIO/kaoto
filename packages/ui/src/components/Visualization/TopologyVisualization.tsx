import { FunctionComponent, ReactNode, useMemo } from 'react';

import { useVisibleVizNodes } from '../../hooks/use-visible-viz-nodes';
import { BaseVisualEntity } from '../../models/visualization/base-visual-entity';
import { Canvas } from './Canvas';
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

  return (
    <VisualizationShell className={className} fallback={fallback}>
      <Canvas
        contextToolbar={contextToolbar}
        nodes={nodes}
        edges={edges}
        entitiesCount={entities.length}
        visibleEntitiesCount={vizNodes.length}
        isModelResolving={isResolving}
      />
    </VisualizationShell>
  );
};
