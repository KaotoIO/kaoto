import './OverlayPresentation.scss';

import { FunctionComponent } from 'react';

import { OverlayEntry } from './overlay-entries';
import { OverlayEntryPresentationProps, overlayInteractionKey } from './overlay-presentation';
import { OverlayInteraction } from './OverlayInteraction';

export const OverlayAnnotation: FunctionComponent<
  OverlayEntryPresentationProps<Extract<OverlayEntry, { kind: 'annotation' }>>
> = ({ entry, onAction }) => {
  const content = [entry.text, entry.value !== undefined ? String(entry.value) : '', entry.unit]
    .filter(Boolean)
    .join(' ');
  return (
    <OverlayInteraction
      key={overlayInteractionKey(entry)}
      className={`kaoto-overlay kaoto-overlay-annotation kaoto-overlay-tone-${entry.tone ?? 'info'} kaoto-overlay-emphasis-${entry.emphasis ?? 'normal'}`}
      interaction={{
        ...entry.interaction,
        accessibleLabel: `${entry.interaction.accessibleLabel}: ${content}`,
        tooltip: [content, entry.interaction.tooltip].filter(Boolean).join('\n'),
      }}
      onAction={
        onAction &&
        ((actionId) => {
          onAction({ entryId: entry.id, target: { ...entry.target }, actionId });
        })
      }
    >
      <span className="kaoto-overlay-text">{content}</span>
    </OverlayInteraction>
  );
};
