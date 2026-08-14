import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { IVisualizationNode, IVisualizationNodeIds } from '../../base-visual-entity';
import { INodeMapper } from './node-mapper';

export class RootNodeMapper implements INodeMapper {
  private readonly mappers: Map<keyof ProcessorDefinition, INodeMapper> = new Map();
  private defaultMapper: INodeMapper | undefined;

  registerMapper(processorName: keyof ProcessorDefinition, mapper: INodeMapper): void {
    this.mappers.set(processorName, mapper);
  }

  registerDefaultMapper(mapper: INodeMapper): void {
    this.defaultMapper = mapper;
  }

  async getVizNodeFromProcessor(
    path: string,
    componentLookup: IVisualizationNodeIds,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const mapper =
      this.mappers.get(componentLookup.primaryNodeId?.name as keyof ProcessorDefinition) || this.defaultMapper;

    if (!mapper) {
      throw new Error(`No mapper found for processor: ${componentLookup.primaryNodeId?.name}`);
    }

    return mapper.getVizNodeFromProcessor(path, componentLookup, entityDefinition);
  }
}
