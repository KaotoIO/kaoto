import { Tooltip } from '@patternfly/react-core';
import { FunctionComponent, ReactNode, SyntheticEvent } from 'react';

import { OverlayInteraction as InteractionData } from './overlay-entries';

interface Props {
  interaction: InteractionData;
  children: ReactNode;
  className: string;
}

const stopPropagation = (event: SyntheticEvent) => {
  event.stopPropagation();
};

// This boundary only stops bubbling; it is not a control and needs no interactive role.
// Keep it around Tooltip itself so React events from the portaled content are isolated too.
const canvasInputBoundary = {
  onClick: stopPropagation,
  onDoubleClick: stopPropagation,
  onPointerDown: stopPropagation,
  onPointerUp: stopPropagation,
  onMouseDown: stopPropagation,
  onMouseUp: stopPropagation,
  onKeyDown: stopPropagation,
  onKeyUp: stopPropagation,
  onContextMenu: stopPropagation,
};

/** Keep annotation input separate from the underlying canvas controls. */
export const OverlayInteraction: FunctionComponent<Props> = ({ interaction, children, className }) => {
  const content = interaction.tooltip ? (
    <button type="button" className={className} aria-label={interaction.accessibleLabel}>
      {children}
    </button>
  ) : (
    <span className={className} aria-label={interaction.accessibleLabel} role="img">
      {children}
    </span>
  );
  return (
    <span className="kaoto-overlay-interaction" {...canvasInputBoundary}>
      {interaction.tooltip ? (
        <Tooltip content={interaction.tooltip} appendTo={() => document.body} entryDelay={0} exitDelay={0}>
          {content}
        </Tooltip>
      ) : (
        content
      )}
    </span>
  );
};
