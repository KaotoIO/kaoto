import './OverlayPresentation.scss';

import { truncate } from 'lodash';
import { FunctionComponent } from 'react';

import { OverlayEntry } from './overlay-entries';
import { OverlayInteraction } from './OverlayInteraction';

export const OverlayAnnotation: FunctionComponent<{ entry: Extract<OverlayEntry, { kind: 'annotation' }> }> = ({
  entry,
}) => {
  const content = [entry.text, entry.value !== undefined ? String(entry.value) : '', entry.unit]
    .filter(Boolean)
    .join(' ');
  const visibleContent = truncate(content, { length: 24, omission: '...' });
  const tooltip =
    entry.interaction.tooltip || visibleContent !== content
      ? [content, entry.interaction.tooltip].filter(Boolean).join('\n')
      : undefined;
  return (
    <OverlayInteraction
      key={JSON.stringify([entry.id, entry.target.kind, entry.target.id])}
      className={`kaoto-overlay kaoto-overlay-annotation kaoto-overlay-tone-${entry.tone ?? 'info'} kaoto-overlay-emphasis-${entry.emphasis ?? 'normal'}`}
      interaction={{
        ...entry.interaction,
        accessibleLabel: `${entry.interaction.accessibleLabel}: ${content}`,
        tooltip,
      }}
    >
      <span className={tooltip ? 'kaoto-overlay-text kaoto-overlay-text--truncated' : 'kaoto-overlay-text'}>
        {visibleContent}
      </span>
    </OverlayInteraction>
  );
};
