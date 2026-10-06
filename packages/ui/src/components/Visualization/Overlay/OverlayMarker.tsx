import './OverlayPresentation.scss';

import { FunctionComponent } from 'react';

import { OverlayEntry } from './overlay-entries';
import { OverlayEntryPresentationProps, overlayInteractionKey } from './overlay-presentation';
import { isExampleOverlayIcon, OverlayIcon } from './OverlayIcon';
import { OverlayInteraction } from './OverlayInteraction';

export const OverlayMarker: FunctionComponent<
  OverlayEntryPresentationProps<Extract<OverlayEntry, { kind: 'marker' }>>
> = ({ entry, onAction }) => {
  const knownIcon = isExampleOverlayIcon(entry.icon);
  return (
    <OverlayInteraction
      key={overlayInteractionKey(entry)}
      className={`kaoto-overlay kaoto-overlay__marker kaoto-overlay--${knownIcon ? (entry.tone ?? 'info') : 'neutral'} kaoto-overlay--${entry.emphasis ?? 'normal'}`}
      interaction={{
        ...entry.interaction,
        accessibleLabel: `${entry.interaction.accessibleLabel}${knownIcon ? '' : ' (unknown marker icon)'}`,
      }}
      onAction={
        onAction &&
        ((actionId) => {
          onAction({ entryId: entry.id, target: { ...entry.target }, actionId });
        })
      }
    >
      <OverlayIcon icon={entry.icon} />
    </OverlayInteraction>
  );
};
