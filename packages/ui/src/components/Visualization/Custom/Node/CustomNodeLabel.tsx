import { Icon } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent } from 'react';

import { CanvasDefaults } from '../../Canvas/canvas.defaults';

interface CustomNodeLabelProps {
  label: string;
  doesHaveWarnings?: boolean;
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
        <Icon status="danger" title={validationText} data-warning={doesHaveWarnings}>
          <ExclamationCircleIcon />
        </Icon>
      )}
      <span title={label}>{label}</span>
    </div>
  </foreignObject>
);
