import { FunctionComponent, ReactNode, useContext, useMemo, useState } from 'react';

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

  const { nodes, edges } = useMemo(() => buildDesignerCanvasModel(vizNodes), [vizNodes]);

  /*
   * The number of entities of the model that is drawn. While the next model resolves, the canvas still shows the
   * previous one, so its empty state stays as it is until then (and there is none before the first model).
   */
  const [drawnEntitiesNumber, setDrawnEntitiesNumber] = useState<number>();
  if (!isResolving && drawnEntitiesNumber !== entities.length) {
    setDrawnEntitiesNumber(entities.length);
  }
  return (
    <VisualizationShell className={className} fallback={fallback}>
      <Canvas
        contextToolbar={contextToolbar}
        nodes={nodes}
        edges={edges}
        isModelResolving={isResolving}
        applyCollapseOnUpdate
      >
        {drawnEntitiesNumber !== undefined && vizNodes.length === 0 && (
          <EmptyCanvas entitiesNumber={drawnEntitiesNumber} />
        )}
      </Canvas>
    </VisualizationShell>
  );
};
