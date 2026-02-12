import './NodeTitle.scss';

import { Label, Popover, Title } from '@patternfly/react-core';
import clsx from 'clsx';
import { FunctionComponent } from 'react';

import OptIcon from '../../assets/data-mapper/field-icons/OptIcon';
import Repeat0Icon from '../../assets/data-mapper/field-icons/Repeat0Icon';
import Repeat1Icon from '../../assets/data-mapper/field-icons/Repeat1Icon';
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
    const optionalField = nodeData.field.minOccurs === 0;
    const repeatingField0 = nodeData.field.minOccurs >= 0 && nodeData.field.maxOccurs === 'unbounded';
    const repeatingField1 = nodeData.field.minOccurs >= 1 && nodeData.field.maxOccurs === 'unbounded';

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
        <div className="node-title-container">
          <span className={clsx('node-title__text', className)} data-rank={rank}>
            {title}
          </span>
          {optionalField && !repeatingField0 && (
            <OptIcon className="node__spacer datamapper-marker-field" aria-label="Optional" />
          )}
          {repeatingField0 && !repeatingField1 && (
            <Repeat0Icon className="node__spacer datamapper-marker-field" aria-label="Repeat0" />
          )}
          {repeatingField1 && <Repeat1Icon className="node__spacer datamapper-marker-field" aria-label="Repeat1" />}
        </div>
      </Popover>
    );
  }

  return content;
};
