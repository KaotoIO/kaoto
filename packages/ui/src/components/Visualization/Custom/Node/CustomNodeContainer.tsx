import { Layers } from '@carbon/icons-react';
import { Icon } from '@patternfly/react-core';
import { BanIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { ElementType, FunctionComponent, Ref } from 'react';

import { IVisualizationNode } from '../../../../models';
import { FloatingCircle } from '../FloatingCircle/FloatingCircle';

export interface CustomNodeContainerProps {
  width: number;
  height: number;
  dataNodelabel?: string;
  foreignObjectRef?: Ref<SVGForeignObjectElement>;
  transform?: string;
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
}

export const CustomNodeContainer: FunctionComponent<CustomNodeContainerProps> = ({
  width,
  height,
  dataNodelabel,
  foreignObjectRef,
  transform,
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
}) => (
  <foreignObject
    data-nodelabel={dataNodelabel}
    width={width}
    height={height}
    ref={foreignObjectRef}
    // Keep drag effects on SVG: HTML transforms/opacity inside foreignObject can hide previews in Safari.
    transform={
      isDragging
        ? [transform, `translate(${width * 0.15}, ${height * 0.15}) scale(0.7)`].filter(Boolean).join(' ')
        : transform
    }
    opacity={isDragging ? 0.5 : undefined}
  >
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
              <BanIcon />
            </Icon>
          </FloatingCircle>
        )}
      </div>
    </div>
  </foreignObject>
);
