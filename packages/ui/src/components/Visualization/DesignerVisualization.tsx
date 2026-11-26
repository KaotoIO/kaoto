import { useVisualizationController } from '@patternfly/react-topology';
import { FunctionComponent, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { useVisibleVizNodes } from '../../hooks/use-visible-viz-nodes';
import { BaseVisualEntity } from '../../models/visualization/base-visual-entity';
import { KaotoResourceContext, ResourceParseState } from '../../providers/kaoto-resource.provider';
import { VisibleFlowsContext } from '../../providers/visible-flows.provider';
import { EventNotifier } from '../../utils';
import { Canvas } from './Canvas';
import { EmptyCanvas } from './Canvas/EmptyCanvas';
import { applyAiToolEdges, buildDesignerCanvasModel, getAiToolEdges, getAiToolEdgesKey } from './designer-canvas-model';
import { BrokenFileEmptyState } from './EmptyState';
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
  const kaotoResourceContext = useContext(KaotoResourceContext);
  /*
   * The last document did not parse. The entities are those of the last valid document, so the canvas keeps showing
   * it, but it is blocked: an edit there would not reach the source.
   */
  const isFileBroken = kaotoResourceContext?.parseState === ResourceParseState.Error;

  const { nodes, edges } = useMemo(() => buildDesignerCanvasModel(vizNodes), [vizNodes]);
  /*
   * A step edited in the side panel keeps its node, whose definition the form changes in place, so the nodes do not
   * change, but the tags of the step may: the links from the agent routes to their tools are read again whenever the
   * source changes, and replaced in the canvas when they differ, leaving the step selected.
   */
  const controller = useVisualizationController();
  useEffect(() => {
    let aiToolEdgesKey = getAiToolEdgesKey(vizNodes);
    return EventNotifier.getInstance().subscribe('entities:updated', () => {
      const key = getAiToolEdgesKey(vizNodes);
      if (key === aiToolEdgesKey) return;
      aiToolEdgesKey = key;
      applyAiToolEdges(controller, getAiToolEdges(vizNodes));
    });
  }, [controller, vizNodes]);

  /*
   * The number of entities of the model that is drawn. While the next model resolves, the canvas still shows the
   * previous one, so its empty state stays as it is until then (and there is none before the first model).
   */
  const [drawnEntitiesNumber, setDrawnEntitiesNumber] = useState<number>();
  if (!isResolving && drawnEntitiesNumber !== entities.length) {
    setDrawnEntitiesNumber(entities.length);
  }
  /** What is laid over the canvas, if anything. A single child, so the canvas renders no overlay without one */
  let overlay: ReactNode = null;
  if (isFileBroken) {
    overlay = (
      <BrokenFileEmptyState
        className="canvas-empty-state"
        data-testid="broken-file-empty-state"
        parsedError={kaotoResourceContext.parsedError}
      />
    );
  } else if (drawnEntitiesNumber !== undefined && vizNodes.length === 0) {
    overlay = <EmptyCanvas entitiesNumber={drawnEntitiesNumber} />;
  }

  return (
    <VisualizationShell className={className} fallback={fallback}>
      <Canvas
        contextToolbar={contextToolbar}
        nodes={nodes}
        edges={edges}
        isModelResolving={isResolving}
        applyCollapseOnUpdate
        blocked={isFileBroken}
      >
        {overlay}
      </Canvas>
    </VisualizationShell>
  );
};
