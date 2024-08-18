import { createVisualizationNode } from '../../../../visualization-node';
import { INodeMapper } from '../../node-mapper';

export const noopNodeMapper: INodeMapper = {
  getVizNodeFromProcessor: () => {
    return createVisualizationNode('noop', {});
  },
};
