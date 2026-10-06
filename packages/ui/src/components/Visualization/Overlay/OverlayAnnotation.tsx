import './OverlayPresentation.scss';

import { FunctionComponent } from 'react';

import { OverlayEntry } from './overlay-entries';
import { OverlayInteraction } from './OverlayInteraction';

export const OverlayAnnotation: FunctionComponent<{ entry: Extract<OverlayEntry, { kind: 'annotation' }> }> = ({
  entry,
}) => {
  const content = [entry.text, entry.value !== undefined ? String(entry.value) : '', entry.unit]
    .filter(Boolean)
    .join(' ');
  return (
    <OverlayInteraction
      key={JSON.stringify([entry.id, entry.target.kind, entry.target.id])}
      className={`kaoto-overlay kaoto-overlay-annotation kaoto-overlay-tone-${entry.tone ?? 'info'} kaoto-overlay-emphasis-${entry.emphasis ?? 'normal'}`}
      interaction={{
        ...entry.interaction,
        accessibleLabel: `${entry.interaction.accessibleLabel}: ${content}`,
        tooltip: entry.interaction.tooltip
          ? [content, entry.interaction.tooltip].filter(Boolean).join('\n')
          : undefined,
      }}
    >
      <span
        className={
          entry.interaction.tooltip ? 'kaoto-overlay-text kaoto-overlay-text--truncated' : 'kaoto-overlay-text'
        }
      >
        {content}
      </span>
    </OverlayInteraction>
  );
};
