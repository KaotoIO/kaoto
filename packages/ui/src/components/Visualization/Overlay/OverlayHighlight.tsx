import './OverlayPresentation.scss';

import { FunctionComponent } from 'react';

import { OverlayEntry } from './overlay-entries';

type OverlayAppearance = Pick<OverlayEntry, 'tone' | 'emphasis'>;
interface OverlayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const highlightProps = ({ tone = 'info', emphasis = 'normal' }: OverlayAppearance) => ({
  className: `kaoto-overlay kaoto-overlay-tone-${tone}`,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: { normal: 3, strong: 5, subdued: 2 }[emphasis],
  strokeDasharray: emphasis === 'subdued' ? '4 3' : undefined,
  pointerEvents: 'none' as const,
  'aria-hidden': true as const,
});

/** Paint before the base node so its selection and validation borders remain visible. */
export const NodeOverlayHighlight: FunctionComponent<OverlayAppearance & { bounds: OverlayBounds }> = ({
  bounds,
  ...appearance
}) => (
  <rect
    {...highlightProps(appearance)}
    x={bounds.x - 4}
    y={bounds.y - 4}
    width={bounds.width + 8}
    height={bounds.height + 8}
    rx={12}
  />
);

/** Geometry is supplied by the renderer; this component never infers connecting edges. */
export const EdgeOverlayHighlight: FunctionComponent<OverlayAppearance & { path: string }> = ({
  path,
  ...appearance
}) => <path {...highlightProps(appearance)} d={path} />;
