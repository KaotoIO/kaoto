import './Canvas.scss';

import { FunctionComponent } from 'react';

import { VisualizationEmptyState } from '../EmptyState';

interface EmptyCanvasProps {
  entitiesNumber: number;
  isModelResolving?: boolean;
}

/**
 * The empty state, shown over the canvas while it has no visible routes.
 *
 * The canvas stays mounted underneath, so the focus survives switching between the empty and the populated view and
 * the canvas background menu is available here too. Only the card takes pointer events, the canvas behind it gets the
 * rest (see `.canvas-empty-state` in `Canvas.scss`).
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
    />
  );
};
