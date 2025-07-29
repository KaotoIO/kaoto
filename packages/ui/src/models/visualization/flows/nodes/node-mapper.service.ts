import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { DATAMAPPER_ID_PREFIX } from '../../../../utils';
import { VizNodesWithEdges } from '../../base-visual-entity';
import { ICamelElementLookupResult } from '../support/camel-component-types';
import { BaseNodeMapper } from './mappers/base-node-mapper';
import { ChoiceNodeMapper } from './mappers/choice-node-mapper';
import { CircuitBreakerNodeMapper } from './mappers/circuit-breaker-node-mapper';
import { DataMapperNodeMapper } from './mappers/datamapper-node-mapper';
import { LoadBalanceNodeMapper } from './mappers/loadbalance-node-mapper';
import { MulticastNodeMapper } from './mappers/multicast-node-mapper';
import { OnFallbackNodeMapper } from './mappers/on-fallback-node-mapper';
import { OtherwiseNodeMapper } from './mappers/otherwise-node-mapper';
import { StepNodeMapper } from './mappers/step-node-mapper';
import { WhenNodeMapper } from './mappers/when-node-mapper';
import { INodeMapper } from './node-mapper';
import { RootNodeMapper } from './root-node-mapper';
import { FromNodeMapper } from './mappers/from-node-mapper';

export class NodeMapperService {
  private static rootNodeMapper: RootNodeMapper;

  static getVizNode(
    path: string,
    componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodesWithEdges {
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
    this.rootNodeMapper.registerMapper('circuitBreaker', new CircuitBreakerNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper(
      'onFallback' as keyof ProcessorDefinition,
      new OnFallbackNodeMapper(this.rootNodeMapper),
    );
    this.rootNodeMapper.registerMapper('choice', new ChoiceNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('when' as keyof ProcessorDefinition, new WhenNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper(
      'otherwise' as keyof ProcessorDefinition,
      new OtherwiseNodeMapper(this.rootNodeMapper),
    );
    this.rootNodeMapper.registerMapper('step', new StepNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('from' as keyof ProcessorDefinition, new FromNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper(DATAMAPPER_ID_PREFIX, new DataMapperNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('multicast', new MulticastNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('loadBalance', new LoadBalanceNodeMapper(this.rootNodeMapper));
  }
}
