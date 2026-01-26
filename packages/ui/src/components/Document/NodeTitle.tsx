import './NodeTitle.scss';

import { Label, Popover, Title } from '@patternfly/react-core';
import clsx from 'clsx';
import { FunctionComponent } from 'react';

import {
  AddMappingNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  NodeData,
} from '../../models/datamapper/visualization';

interface INodeTitle {
  className?: string;
  rank: number;
  nodeData: NodeData;
  isDocument: boolean;
}

export const NodeTitle: FunctionComponent<INodeTitle> = ({ className, rank, nodeData, isDocument }) => {
  const title = nodeData.title;
  const content = (
    <span className={clsx('node-title__text', className)} data-rank={rank}>
      {title}
    </span>
  );

  if (nodeData instanceof MappingNodeData && !(nodeData instanceof FieldItemNodeData)) {
    return <Label>{content}</Label>;
  }

  if (isDocument) {
    return <Title headingLevel="h5">{content}</Title>;
  }

  // Wrap with popover if the nodeData is a field representation
  if (
    nodeData instanceof FieldNodeData ||
    nodeData instanceof FieldItemNodeData ||
    nodeData instanceof AddMappingNodeData
  ) {
    const requiredField = nodeData.field.minOccurs !== 0;
    const updatedContent = (
      <span className={clsx('node-title__text', className)} data-rank={rank}>
        {title} {requiredField && <span className="required-information">*</span>}
      </span>
    );

    return (
      <Popover
        triggerAction="hover"
        position="right"
        aria-label="Hoverable popover"
        bodyContent={
          <div>
            <div className="popover__row">
              <span className="popover__cell">minOccurs :&nbsp;</span>
              <span className="popover__cell">{nodeData.field.minOccurs}</span>
            </div>
            <div className="popover__row">
              <span className="popover__cell">maxOccurs :&nbsp;</span>
              <span className="popover__cell">{nodeData.field.maxOccurs}</span>
            </div>
          </div>
        }
      >
        {updatedContent}
      </Popover>
    );
  }

  return content;
};
