import { IVisualizationNode, IVisualizationNodeIds } from '../../base-visual-entity';

export interface INodeMapper {
  getVizNodeFromProcessor(
    path: string,
    componentLookup: IVisualizationNodeIds,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode>;
}
