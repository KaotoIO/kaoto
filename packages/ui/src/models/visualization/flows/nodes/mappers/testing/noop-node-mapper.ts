import { IVisualizationNodeIds } from '../../../../base-visual-entity';
import { createVisualizationNode } from '../../../../visualization-node';
import { INodeMapper } from '../../node-mapper';

export const noopNodeMapper: INodeMapper = {
  getVizNodeFromProcessor: async (path: string, componentLookup: IVisualizationNodeIds, entityDefinition: unknown) => {
    return createVisualizationNode('noop', {
      name: 'noop',
      path,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      componentLookup,
      entityDefinition,
    });
  },
};
