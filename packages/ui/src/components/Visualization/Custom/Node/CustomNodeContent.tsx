import { Icon } from '@patternfly/react-core';
import { BanIcon } from '@patternfly/react-icons';
import { ElementType, FunctionComponent } from 'react';

import { IVisualizationNode } from '../../../../models';
import { IconResolver } from '../../../IconResolver';
import { Anchors } from '../../../registers/anchors';
import { RenderingAnchor } from '../../../RenderingAnchor/RenderingAnchor';
import { FloatingCircle } from '../FloatingCircle/FloatingCircle';

export interface CustomNodeContentProps {
  vizNode: IVisualizationNode;
  tooltipContent: string | undefined;
  childCount: number;
  ProcessorIcon: ElementType | null;
  processorDescription: string | undefined;
  isDisabled: boolean;
}

export const CustomNodeContent: FunctionComponent<CustomNodeContentProps> = ({
  vizNode,
  tooltipContent,
  childCount,
  ProcessorIcon,
  processorDescription,
  isDisabled,
}) => {
  return (
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
      <RenderingAnchor anchorTag={Anchors.CanvasNodeBottomRight} vizNode={vizNode} />
    </div>
  );
};
