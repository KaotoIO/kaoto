import { DATAMAPPER_ID_PREFIX } from '../../../../utils';
import { IVisualizationNode } from '../../base-visual-entity';
import { ICamelElementLookupResult } from '../support/camel-component-types';
import { BaseNodeMapper } from './mappers/base-node-mapper';
import { ChoiceNodeMapper } from './mappers/choice-node-mapper';
import { DataMapperNodeMapper } from './mappers/datamapper-node-mapper';
import { OtherwiseNodeMapper } from './mappers/otherwise-node-mapper';
import { StepNodeMapper } from './mappers/step-node-mapper';
import { WhenNodeMapper } from './mappers/when-node-mapper';
import { INodeMapper } from './node-mapper';
import { RootNodeMapper } from './root-node-mapper';

export class NodeMapperService {
  private static rootNodeMapper: RootNodeMapper;

  static getVizNode(
    path: string,
    componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): IVisualizationNode {
    return this.getInstance().getVizNodeFromProcessor(path, componentLookup, entityDefinition);
  }

  private static getInstance(): INodeMapper {
    if (!this.rootNodeMapper) {
      NodeMapperService.initializeRootNodeMapper();
    }

    return this.rootNodeMapper;
  }

  private static initializeRootNodeMapper() {
    this.rootNodeMapper = new RootNodeMapper();
    this.rootNodeMapper.registerDefaultMapper(new BaseNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('choice', new ChoiceNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('when', new WhenNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('otherwise', new OtherwiseNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('step', new StepNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper(DATAMAPPER_ID_PREFIX, new DataMapperNodeMapper(this.rootNodeMapper));
  }
}
