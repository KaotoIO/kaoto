import { createVisualizationNode } from '../../../../visualization-node';
import { ICamelElementLookupResult } from '../../../support/camel-component-types';
import { INodeMapper } from '../../node-mapper';

export const noopNodeMapper: INodeMapper = {
  getVizNodeFromProcessor: (path: string, componentLookup: ICamelElementLookupResult, entityDefinition: unknown) => {
    return { nodes: [createVisualizationNode('noop', { path, componentLookup, entityDefinition })], edges: [] };
  },
};
