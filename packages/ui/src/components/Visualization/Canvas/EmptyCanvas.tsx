import './Canvas.scss';

import { TopologyView } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, ReactNode } from 'react';

import { VisualizationEmptyState } from '../EmptyState';
import { CanvasDefaults } from './canvas.defaults';
import { useCanvasFocusTarget } from './canvas-focus-handoff';

interface EmptyCanvasProps {
  entitiesNumber: number;
  contextToolbar?: ReactNode;
  isModelResolving?: boolean;
}

export const EmptyCanvas: FunctionComponent<PropsWithChildren<EmptyCanvasProps>> = ({
  entitiesNumber,
  contextToolbar,
  isModelResolving,
}) => {
  const canvasRef = useCanvasFocusTarget(!isModelResolving);
  if (isModelResolving) {
    return null;
  }

  return (
    <TopologyView
      ref={canvasRef}
      id={CanvasDefaults.CANVAS_MAIN_ID}
      tabIndex={0}
      role="region"
      aria-label="Route canvas"
      contextToolbar={contextToolbar}
    >
      <VisualizationEmptyState
        className="canvas-empty-state"
        data-testid="visualization-empty-state"
        entitiesNumber={entitiesNumber}
      />
    </TopologyView>
  );
};
