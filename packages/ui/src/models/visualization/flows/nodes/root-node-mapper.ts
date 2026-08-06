import { IVisualizationNode } from '../../base-visual-entity';
import { NodeIdentity } from '../../node-identity';
import { INodeMapper } from './node-mapper';

export class RootNodeMapper implements INodeMapper {
  private readonly mappers: Map<string, INodeMapper> = new Map();
  private defaultMapper: INodeMapper | undefined;

  registerMapper(processorName: string, mapper: INodeMapper): void {
    this.mappers.set(processorName, mapper);
  }

  registerDefaultMapper(mapper: INodeMapper): void {
    this.defaultMapper = mapper;
  }

  async getVizNodeFromProcessor(
    path: string,
    primaryNodeId: NodeIdentity,
    entityDefinition: unknown,
    secondaryNodeId?: NodeIdentity,
    tertiaryNodeId?: NodeIdentity,
  ): Promise<IVisualizationNode> {
    const mapper = this.mappers.get(primaryNodeId.name) || this.defaultMapper;

    if (!mapper) {
      throw new Error(`No mapper found for processor: ${primaryNodeId.name}`);
    }

    return mapper.getVizNodeFromProcessor(path, primaryNodeId, entityDefinition, secondaryNodeId, tertiaryNodeId);
  }
}
