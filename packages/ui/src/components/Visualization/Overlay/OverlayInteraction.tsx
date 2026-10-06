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

/** Keep annotation input separate from the underlying canvas controls. */
export const OverlayInteraction: FunctionComponent<Props> = ({ interaction, children, className }) => {
  const content = (
    <span
      className={className}
      aria-label={interaction.accessibleLabel}
      role="img"
      tabIndex={interaction.tooltip ? 0 : undefined}
    >
      {children}
    </span>
  );
  return (
    <span
      className="kaoto-overlay-interaction"
      onClick={stopPropagation}
      onDoubleClick={stopPropagation}
      onPointerDown={stopPropagation}
      onPointerUp={stopPropagation}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      onKeyDown={stopPropagation}
      onKeyUp={stopPropagation}
      onContextMenu={stopPropagation}
    >
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
