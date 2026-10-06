import './OverlayPresentation.scss';

import { CircleIcon, FlagIcon, InfoCircleIcon, QuestionCircleIcon, SquareFullIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

// Provisional demo mapping, not a public icon catalog or consumer-state vocabulary.
const exampleIcons = new Map([
  ['circle', CircleIcon],
  ['diamond', SquareFullIcon],
  ['flag', FlagIcon],
  ['info', InfoCircleIcon],
]);

export const isExampleOverlayIcon = (icon: string) => exampleIcons.has(icon);

export const OverlayIcon: FunctionComponent<{ icon: string }> = ({ icon }) => {
  const Glyph = exampleIcons.get(icon) ?? QuestionCircleIcon;
  return (
    <span className={`kaoto-overlay__icon${icon === 'diamond' ? ' kaoto-overlay__icon--diamond' : ''}`}>
      <Glyph aria-hidden="true" />
      {!isExampleOverlayIcon(icon) && <span className="pf-v6-screen-reader">Unknown marker icon</span>}
    </span>
  );
};
