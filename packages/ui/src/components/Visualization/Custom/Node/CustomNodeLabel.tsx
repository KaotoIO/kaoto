import { CheckmarkFilled, WarningFilled } from '@carbon/icons-react';
import { Icon } from '@patternfly/react-core';
import clsx from 'clsx';
import { FunctionComponent } from 'react';

import { CanvasDefaults } from '../../Canvas/canvas.defaults';

interface CustomNodeLabelProps {
  label: string;
  doesHaveWarnings?: boolean;
  verified?: boolean;
  validationText?: string;
  x?: number;
  y?: number;
  transform?: string;
  width?: number;
  height?: number;
  className?: string;
}

export const CustomNodeLabel: FunctionComponent<CustomNodeLabelProps> = ({
  label,
  doesHaveWarnings = false,
  verified = false,
  validationText,
  x,
  y,
  transform,
  width = CanvasDefaults.DEFAULT_LABEL_WIDTH,
  height = CanvasDefaults.DEFAULT_LABEL_HEIGHT,
  className = 'custom-node__label',
}) => (
  <foreignObject
    width={width}
    height={height}
    className={className}
    {...(transform ? { transform } : { x: x!, y: y! })}
  >
    <div
      className={clsx('custom-node__label__text', {
        'custom-node__label__text__error': doesHaveWarnings,
      })}
    >
      {doesHaveWarnings && (
        <Icon
          status="danger"
          title={validationText}
          aria-label={validationText || 'Warning'}
          role="img"
          data-warning={doesHaveWarnings}
        >
          <WarningFilled />
        </Icon>
      )}
      {verified && (
        <Icon status="success" title="Step verified" aria-label="Verified" role="img" data-verified={verified}>
          <CheckmarkFilled />
        </Icon>
      )}
      <span title={label}>{label}</span>
    </div>
  </foreignObject>
);
