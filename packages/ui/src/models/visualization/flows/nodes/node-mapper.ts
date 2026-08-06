import { IVisualizationNode } from '../../base-visual-entity';
import { NodeIdentity } from '../../node-identity';

export interface INodeMapper {
  getVizNodeFromProcessor(
    path: string,
    primaryNodeId: NodeIdentity,
    entityDefinition: unknown,
    secondaryNodeId?: NodeIdentity,
    tertiaryNodeId?: NodeIdentity,
  ): Promise<IVisualizationNode>;
}
