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
  tooltipContent: string | undefined;
  isCollapsed: boolean;
  childCount: number;
  hasGroupChildren?: boolean;
  ProcessorIcon: ElementType | null;
  processorDescription: string | undefined;
  isDisabled: boolean;
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
  tooltipContent,
  isCollapsed,
  childCount,
  hasGroupChildren,
  ProcessorIcon,
  processorDescription,
  isDisabled,
}) => (
  <foreignObject
    data-nodelabel={dataNodelabel}
    width={width}
    height={height}
    ref={foreignObjectRef}
    {...(transform !== undefined && { transform })}
  >
    <div data-testid={dataTestId} className={clsx('custom-node__container', containerClassNames)}>
      <div title={tooltipContent} className="custom-node__container__image">
        <img src={vizNode.data.iconUrl} alt={tooltipContent ?? (vizNode.data.iconAlt as string)} />

        {isCollapsed && childCount > 0 && (
          <FloatingCircle
            className={clsx('step-icon step-icon__processor', { 'step-icon-collection': hasGroupChildren })}
          >
            {hasGroupChildren && (
              <Icon size="sm">
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
