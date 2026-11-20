import './Canvas.scss';

import { FunctionComponent, useLayoutEffect } from 'react';

import { VisualizationEmptyState } from '../EmptyState';
import { CanvasDefaults } from './canvas.defaults';
import { focusCanvasAfterRender } from './canvas-focus';

const EMPTY_STATE_TEST_ID = 'visualization-empty-state';

interface EmptyCanvasProps {
  entitiesNumber: number;
}

/**
 * The empty state of the canvas, rendered as a child of `Canvas` and laid over its graph.
 *
 * The canvas stays mounted underneath, so its background menu and its control bar are available here as well. Only the
 * card takes pointer events, the canvas behind it gets the rest (see `.canvas-overlay` in `Canvas.scss`).
 *
 * Its actions, like showing all routes or creating the first one, remove it once the canvas has drawn the routes. When
 * it had the focus then, the canvas takes it, instead of leaving it on the page body.
 */
export const EmptyCanvas: FunctionComponent<EmptyCanvasProps> = ({ entitiesNumber }) => {
  /* A layout effect's cleanup runs while the empty state is still in the document, so the focus is still inside it */
  useLayoutEffect(
    () => () => {
      if (document.activeElement?.closest(`[data-testid="${EMPTY_STATE_TEST_ID}"]`)) {
        focusCanvasAfterRender();
      }
    },
    [],
  );

  return (
    <VisualizationEmptyState
      className="canvas-empty-state"
      data-testid={EMPTY_STATE_TEST_ID}
      entitiesNumber={entitiesNumber}
      titleId={CanvasDefaults.EMPTY_STATE_TITLE_ID}
    />
  );
};
