import { FunctionComponent } from 'react';

import { VisualizationEmptyState } from '../EmptyState';
import { CanvasDefaults } from './canvas.defaults';

interface EmptyCanvasProps {
  entitiesNumber: number;
  isModelResolving?: boolean;
}

/**
 * The empty state shown over the empty graph, as a child of `Canvas`, so the canvas and its toolbars stay mounted.
 * Its title describes the canvas for screen readers.
 */
export const EmptyCanvas: FunctionComponent<EmptyCanvasProps> = ({ entitiesNumber, isModelResolving }) => {
  if (isModelResolving) {
    return null;
  }

  return (
    <VisualizationEmptyState
      className="canvas-empty-state"
      data-testid="visualization-empty-state"
      entitiesNumber={entitiesNumber}
      titleId={CanvasDefaults.EMPTY_STATE_TITLE_ID}
    />
  );
};
