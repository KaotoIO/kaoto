import { FunctionComponent, ReactNode, useContext, useMemo } from 'react';

import { useVisibleVizNodes } from '../../hooks/use-visible-viz-nodes';
import { BaseVisualEntity } from '../../models/visualization/base-visual-entity';
import { VisibleFlowsContext } from '../../providers/visible-flows.provider';
import { Canvas } from './Canvas';
import { EmptyCanvas } from './Canvas/EmptyCanvas';
import { buildDesignerCanvasModel } from './designer-canvas-model';
import { VisualizationShell } from './VisualizationShell';

interface DesignerVisualizationProps {
  className?: string;
  entities: BaseVisualEntity[];
  fallback?: ReactNode;
  contextToolbar?: ReactNode;
}

export const DesignerVisualization: FunctionComponent<DesignerVisualizationProps> = ({
  className,
  entities,
  fallback,
  contextToolbar,
}) => {
  const { visibleFlows } = useContext(VisibleFlowsContext)!;
  const { vizNodes, isResolving } = useVisibleVizNodes(entities, visibleFlows);

  const { nodes, edges } = useMemo(() => {
    if (isResolving) {
      return { nodes: [], edges: [] };
    }
    return buildDesignerCanvasModel(vizNodes);
  }, [vizNodes, isResolving]);

  const emptyState = useMemo(() => {
    if (entities.length === 0) {
      return { entitiesNumber: 0 };
    }
    if (vizNodes.length === 0) {
      return { entitiesNumber: entities.length };
    }
    return undefined;
  }, [entities.length, vizNodes.length]);

  return (
    <VisualizationShell className={className} fallback={fallback}>
      {!emptyState && (
        <Canvas
          contextToolbar={contextToolbar}
          nodes={nodes}
          edges={edges}
          isModelResolving={isResolving}
          applyCollapseOnUpdate
        />
      )}
      {emptyState && (
        <EmptyCanvas
          entitiesNumber={emptyState.entitiesNumber}
          isModelResolving={isResolving}
          contextToolbar={contextToolbar}
        />
      )}
    </VisualizationShell>
  );
};
