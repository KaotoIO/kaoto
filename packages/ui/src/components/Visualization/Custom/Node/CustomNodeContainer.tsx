import clsx from 'clsx';
import { FunctionComponent, Ref } from 'react';

import { CustomNodeContent, CustomNodeContentProps } from './CustomNodeContent';

export interface CustomNodeContainerProps extends CustomNodeContentProps {
  width: number;
  height: number;
  dataNodelabel?: string;
  foreignObjectRef?: Ref<SVGForeignObjectElement>;
  transform?: string;
  dataTestId: string;
  containerClassNames?: Record<string, boolean>;
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
      <CustomNodeContent
        vizNode={vizNode}
        tooltipContent={tooltipContent}
        childCount={childCount}
        ProcessorIcon={ProcessorIcon}
        processorDescription={processorDescription}
        isDisabled={isDisabled}
      />
    </div>
  </foreignObject>
);
