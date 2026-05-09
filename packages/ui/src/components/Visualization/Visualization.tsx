import './Visualization.scss';

import { CanvasFormTabsProvider } from '@kaoto/forms';
import { FunctionComponent, PropsWithChildren, ReactNode, useContext } from 'react';

import { useVisibleVizNodes } from '../../hooks/use-visible-viz-nodes';
import { BaseVisualEntity } from '../../models/visualization/base-visual-entity';
import { VisibleFlowsContext } from '../../providers/visible-flows.provider';
import { ErrorBoundary } from '../ErrorBoundary';
import { Canvas } from './Canvas';
import { CanvasFallback } from './CanvasFallback';

interface VisualizationProps {
  className?: string;
  entities: BaseVisualEntity[];
  fallback?: ReactNode;
  contextToolbar?: ReactNode;
}

export const Visualization: FunctionComponent<PropsWithChildren<VisualizationProps>> = ({
  className,
  entities,
  fallback,
  contextToolbar,
}) => {
  const { visibleFlows } = useContext(VisibleFlowsContext)!;
  const { vizNodes, isResolving } = useVisibleVizNodes(entities, visibleFlows);

  return (
    <div className={`canvas-surface ${className ?? ''}`}>
      <CanvasFormTabsProvider>
        <ErrorBoundary fallback={fallback ?? <CanvasFallback />}>
          <Canvas
            contextToolbar={contextToolbar}
            vizNodes={vizNodes}
            entitiesCount={entities.length}
            isVizNodesResolving={isResolving}
          />
        </ErrorBoundary>
      </CanvasFormTabsProvider>
    </div>
  );
};
