import './SplitPanel.scss';

import { Tile } from '@carbon/react';
import { FunctionComponent, PropsWithChildren, useMemo } from 'react';

// Internal constraints for panel widths
const MIN_WIDTH = 10; // 10%
const MAX_WIDTH = 90; // 90%

export interface SplitPanelProps {
  width: number;
  position: 'left' | 'right';
  id?: string;
  ariaLabel?: string;
}

export const SplitPanel: FunctionComponent<PropsWithChildren<SplitPanelProps>> = ({
  children,
  width,
  position,
  id,
  ariaLabel,
}) => {
  // Constrain width to internal min/max bounds
  const constrainedWidth = useMemo(() => {
    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
  }, [width]);

  const panelClassName = `split-panel split-panel--${position}`;
  const panelId = id || `${position}-panel`;
  const panelLabel = ariaLabel || `${position.charAt(0).toUpperCase() + position.slice(1)} panel`;

  return (
    <section
      id={panelId}
      className={panelClassName}
      style={{ width: `${constrainedWidth}%` }}
      data-testid={`split-panel--${position}`}
      aria-label={panelLabel}
    >
      <Tile>{children}</Tile>
    </section>
  );
};
