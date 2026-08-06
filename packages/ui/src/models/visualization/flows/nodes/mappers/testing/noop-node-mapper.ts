import { NodeIdentity } from '../../../../node-identity';
import { createVisualizationNode } from '../../../../visualization-node';
import { INodeMapper } from '../../node-mapper';

export const noopNodeMapper: INodeMapper = {
  getVizNodeFromProcessor: async (
    path: string,
    primaryNodeId: NodeIdentity,
    entityDefinition: unknown,
    _secondaryNodeId?: NodeIdentity,
    _tertiaryNodeId?: NodeIdentity,
  ) => {
    return createVisualizationNode('noop', {
      name: 'noop',
      path,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      primaryNodeId,
      entityDefinition,
    });
  },
};
