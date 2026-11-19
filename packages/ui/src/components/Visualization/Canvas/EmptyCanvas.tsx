import './Canvas.scss';

import { FunctionComponent } from 'react';

import { VisualizationEmptyState } from '../EmptyState';

interface EmptyCanvasProps {
  entitiesNumber: number;
}

/**
 * The empty state of the canvas, rendered as a child of `Canvas` and laid over its graph.
 *
 * The canvas stays mounted underneath, so its background menu and its control bar are available here as well. Only the
 * card takes pointer events, the canvas behind it gets the rest (see `.canvas-overlay` in `Canvas.scss`).
 */
export const EmptyCanvas: FunctionComponent<EmptyCanvasProps> = ({ entitiesNumber }) => (
  <VisualizationEmptyState
    className="canvas-empty-state"
    data-testid="visualization-empty-state"
    entitiesNumber={entitiesNumber}
  />
);
