import { VizNodesWithEdges } from '../../base-visual-entity';
import { ICamelElementLookupResult } from '../support/camel-component-types';

export interface INodeMapper {
  getVizNodeFromProcessor(
    path: string,
    componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodesWithEdges;
}
