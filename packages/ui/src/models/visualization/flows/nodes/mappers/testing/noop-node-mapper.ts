import { createVisualizationNode } from '../../../../visualization-node';
import { ICamelElementLookupResult } from '../../../support/camel-component-types';
import { INodeMapper } from '../../node-mapper';

export const noopNodeMapper: INodeMapper = {
  getVizNodeFromProcessor: async (
    path: string,
    componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ) => {
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
