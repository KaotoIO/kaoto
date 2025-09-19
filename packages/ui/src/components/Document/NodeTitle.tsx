import { Label, Title } from '@patternfly/react-core';
import clsx from 'clsx';
import { FunctionComponent } from 'react';
import { FieldItemNodeData, MappingNodeData, NodeData } from '../../models/datamapper/visualization';
import './NodeTitle.scss';

interface INodeTitle {
  className?: string;
  nodeData: NodeData;
  isDocument: boolean;
}

export const NodeTitle: FunctionComponent<INodeTitle> = ({ className, nodeData, isDocument }) => {
  const title = nodeData.title;
  const content = (
    <span title={title} className={clsx('node-title__text', className)}>
      {title}
    </span>
  );

  if (nodeData instanceof MappingNodeData && !(nodeData instanceof FieldItemNodeData)) {
    return <Label>{content}</Label>;
  }

  if (isDocument) {
    return <Title headingLevel="h5">{content}</Title>;
  }

  return content;
};
