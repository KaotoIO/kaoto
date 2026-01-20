import { Icon } from '@patternfly/react-core';
import { BanIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { ElementType, FunctionComponent, Ref } from 'react';

import { IVisualizationNode } from '../../../../models';
import { IconResolver } from '../../../IconResolver';
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
  childCount: number;
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
  childCount,
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
        <IconResolver alt={tooltipContent} catalogKind={vizNode.data.catalogKind} name={vizNode.data.name} />

        {childCount > 0 && (
          <FloatingCircle className="step-icon step-icon__processor">
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
