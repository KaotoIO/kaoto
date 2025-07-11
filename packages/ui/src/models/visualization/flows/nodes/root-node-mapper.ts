import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { VizNodesWithEdges } from '../../base-visual-entity';
import { ICamelElementLookupResult } from '../support/camel-component-types';
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

  getVizNodeFromProcessor(
    path: string,
    componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodesWithEdges {
    const mapper = this.mappers.get(componentLookup.processorName) || this.defaultMapper;

    if (!mapper) {
      throw new Error(`No mapper found for processor: ${componentLookup.processorName}`);
    }

    return mapper.getVizNodeFromProcessor(path, componentLookup, entityDefinition);
  }
}
