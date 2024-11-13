import { Label, Title, Truncate } from '@patternfly/react-core';
import clsx from 'clsx';
import { FunctionComponent } from 'react';
import { MappingNodeData, NodeData } from '../../models/datamapper/visualization';
import './Document.scss';

interface INodeTitle {
  className?: string;
  nodeData: NodeData;
  isDocument: boolean;
}

export const NodeTitle: FunctionComponent<INodeTitle> = ({ className, nodeData, isDocument }) => {
  if (nodeData instanceof MappingNodeData) {
    return (
      <Label>
        <Truncate content={nodeData.title ?? ''} className={clsx('truncate', className)} />
      </Label>
    );
  }

  if (isDocument) {
    return (
      <Title headingLevel="h5">
        <Truncate content={nodeData.title ?? ''} className={clsx('truncate', className)} />
      </Title>
    );
  }

  return <Truncate content={nodeData.title ?? ''} className={clsx('truncate', className)} />;
};
