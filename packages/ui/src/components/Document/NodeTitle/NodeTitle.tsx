import './NodeTitle.scss';

import { Label, Title } from '@patternfly/react-core';
import clsx from 'clsx';
import { FunctionComponent } from 'react';

import {
  AddMappingNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  NodeData,
  UnknownMappingNodeData,
  VariableNodeData,
} from '../../../models/datamapper/visualization';
import { VisualizationService } from '../../../services/visualization/visualization.service';
import { FieldNodeTitle } from './FieldNodeTitle';
import { UnknownMappingLabel } from './UnknownMappingLabel';

interface INodeTitle {
  className?: string;
  rank: number;
  nodeData: NodeData;
  isDocument: boolean;
  namespaceMap?: Record<string, string>;
}

export const NodeTitle: FunctionComponent<INodeTitle> = ({
  className,
  rank,
  nodeData,
  isDocument,
  namespaceMap = {},
}) => {
  const title = VisualizationService.createNodeTitle(nodeData);
  const content = (
    <span className={clsx('node-title__text', className)} data-rank={rank}>
      {title}
    </span>
  );

  if (nodeData instanceof UnknownMappingNodeData) {
    return <UnknownMappingLabel nodeData={nodeData} content={content} />;
  }

  if (nodeData instanceof VariableNodeData) {
    return (
      <>
        <Label isCompact>$</Label>
        {content}
      </>
    );
  }

  if (nodeData instanceof MappingNodeData && !(nodeData instanceof FieldItemNodeData)) {
    return <Label>{content}</Label>;
  }

  if (isDocument) {
    return <Title headingLevel="h5">{content}</Title>;
  }

  if (
    nodeData instanceof FieldNodeData ||
    nodeData instanceof FieldItemNodeData ||
    nodeData instanceof AddMappingNodeData
  ) {
    return (
      <FieldNodeTitle className={className} rank={rank} title={title} nodeData={nodeData} namespaceMap={namespaceMap} />
    );
  }

  return content;
};
