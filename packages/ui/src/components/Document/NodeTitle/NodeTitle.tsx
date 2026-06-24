import './NodeTitle.scss';

import { Title } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

import {
  AddMappingNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  NodeData,
} from '../../../models/datamapper/visualization';
import { VisualizationService } from '../../../services/visualization/visualization.service';
import { FieldNodeTitle } from './FieldNodeTitle';
import { MappingItemNodeTitle } from './MappingItemNodeTitle';
import { NodeTitleText } from './NodeTitleText';

interface INodeTitle {
  className?: string;
  rank: number;
  nodeData: NodeData;
  isDocument: boolean;
}

export const NodeTitle: FunctionComponent<INodeTitle> = ({ className, rank, nodeData, isDocument }) => {
  if (nodeData instanceof MappingNodeData && !(nodeData instanceof FieldItemNodeData)) {
    return <MappingItemNodeTitle className={className} rank={rank} nodeData={nodeData} />;
  }

  const title = VisualizationService.createNodeTitle(nodeData);
  const content = <NodeTitleText className={className} rank={rank} title={title} />;

  if (isDocument) {
    return <Title headingLevel="h5">{content}</Title>;
  }

  if (
    nodeData instanceof FieldNodeData ||
    nodeData instanceof FieldItemNodeData ||
    nodeData instanceof AddMappingNodeData
  ) {
    return <FieldNodeTitle className={className} rank={rank} title={title} nodeData={nodeData} />;
  }

  return content;
};
