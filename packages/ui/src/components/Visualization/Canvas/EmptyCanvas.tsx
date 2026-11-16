import './Canvas.scss';

import { FunctionComponent } from 'react';

import { VisualizationEmptyState } from '../EmptyState';
import { CanvasDefaults } from './canvas.defaults';

interface EmptyCanvasProps {
  entitiesNumber: number;
  isModelResolving?: boolean;
}

/**
 * The empty state, shown over the canvas while it has no visible routes.
 *
 * It is a sibling of the canvas, not a child: the canvas stays mounted, so the focus survives switching between the
 * empty and the populated canvas, and its keyboard handlers (Escape clears the selection) do not see the keys pressed
 * here. Only the card takes pointer events, the canvas behind it gets the rest.
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
