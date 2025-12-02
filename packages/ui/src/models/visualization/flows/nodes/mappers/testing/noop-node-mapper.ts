import { CatalogKind } from '../../../../../catalog-kind';
import { createVisualizationNode } from '../../../../visualization-node';
import { ICamelElementLookupResult } from '../../../support/camel-component-types';
import { INodeMapper } from '../../node-mapper';

export const noopNodeMapper: INodeMapper = {
  getVizNodeFromProcessor: (path: string, componentLookup: ICamelElementLookupResult, entityDefinition: unknown) => {
    return createVisualizationNode('noop', {
      catalogKind: CatalogKind.Component,
      name: 'noop',
      path,
      componentLookup,
      entityDefinition,
    });
  },
};
