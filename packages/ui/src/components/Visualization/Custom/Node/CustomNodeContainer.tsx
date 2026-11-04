import { Error as ErrorIcon, Layers } from '@carbon/icons-react';
import { Icon } from '@patternfly/react-core';
import clsx from 'clsx';
import { ElementType, FunctionComponent, ReactNode, Ref } from 'react';

import { IVisualizationNode } from '../../../../models';
import { getDragPreviewTransform } from '../../Canvas/CanvasUtils';
import { FloatingCircle } from '../FloatingCircle/FloatingCircle';

export interface CustomNodeContainerProps {
  width: number;
  height: number;
  dataNodelabel?: string;
  foreignObjectRef?: Ref<SVGForeignObjectElement>;
  transform?: string;
  className?: string;
  dataTestId: string;
  containerClassNames?: Record<string, boolean>;
  vizNode: IVisualizationNode;
  isCollapsed: boolean;
  childCount: number;
  hasGroupChildren?: boolean;
  ProcessorIcon: ElementType | null;
  processorDescription?: string;
  isDisabled: boolean;
  isDragging?: boolean;
  children?: ReactNode;
}

export const CustomNodeContainer: FunctionComponent<CustomNodeContainerProps> = ({
  width,
  height,
  dataNodelabel,
  foreignObjectRef,
  transform,
  className,
  dataTestId,
  containerClassNames = {},
  vizNode,
  isCollapsed,
  childCount,
  hasGroupChildren,
  ProcessorIcon,
  processorDescription,
  isDisabled,
  isDragging = false,
  children,
}) => (
  <g
    className={clsx('custom-node__visual', className)}
    // Composite the focus ring and HTML badges together so the ring cannot show through a translucent badge.
    // Keep transforms and opacity on SVG for Safari.
    transform={isDragging ? [transform, getDragPreviewTransform(width, height)].filter(Boolean).join(' ') : transform}
    opacity={isDragging ? 0.5 : undefined}
  >
    {children}
    <foreignObject data-nodelabel={dataNodelabel} width={width} height={height} ref={foreignObjectRef}>
      <div data-testid={dataTestId} className={clsx('custom-node__container', containerClassNames)}>
        <div
          role="img"
          aria-label={vizNode.data.description?.trim() || vizNode.data.name}
          className="custom-node__container__image"
        >
          {vizNode.data.iconUrl && (
            // aria-hidden: the parent div[role="img"] already labels the container; the img is presentational here
            <img src={vizNode.data.iconUrl} aria-hidden="true" alt="" />
          )}

          {isCollapsed && childCount > 0 && (
            <FloatingCircle
              className={clsx('step-icon step-icon__processor', { 'step-icon-collection': hasGroupChildren })}
            >
              {hasGroupChildren && (
                <Icon size="sm" aria-label="contains nested collections">
                  <Layers />
                </Icon>
              )}
              <span title={`${childCount}`}>{childCount}</span>
            </FloatingCircle>
          )}
          {ProcessorIcon && (
            <FloatingCircle className="step-icon step-icon__processor">
              <Icon status="info" size="lg">
                <ProcessorIcon title={processorDescription} />
              </Icon>
            </FloatingCircle>
          )}
          {isDisabled && (
            <FloatingCircle className="step-icon step-icon__disabled">
              <Icon status="danger" size="lg">
                <ErrorIcon />
              </Icon>
            </FloatingCircle>
          )}
        </div>
      </div>
    </foreignObject>
  </g>
);
