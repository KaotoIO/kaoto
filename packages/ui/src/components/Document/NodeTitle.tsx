import './NodeTitle.scss';

import { Label, Popover, Title } from '@patternfly/react-core';
import clsx from 'clsx';
import { FunctionComponent } from 'react';

import optionalIcon from '../../assets/data-mapper/field-icons/optional-icon.svg';
import repeat0Icon from '../../assets/data-mapper/field-icons/repeat0-icon.svg';
import repeat1Icon from '../../assets/data-mapper/field-icons/repeat1-icon.svg';
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
            <img className="datamapper-marker-field" src={optionalIcon} alt="Optional" />
          )}
          {repeatingField0 && !repeatingField1 && (
            <img className="datamapper-marker-field" src={repeat0Icon} alt="Repeat0" />
          )}
          {repeatingField1 && <img className="datamapper-marker-field" src={repeat1Icon} alt="Repeat1" />}
        </div>
      </Popover>
    );
  }

  return content;
};
