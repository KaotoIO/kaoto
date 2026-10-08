import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { DATAMAPPER_ID_PREFIX } from '../../../../utils';
import { IVisualizationNode, IVisualizationNodeIds } from '../../base-visual-entity';
import { BaseNodeMapper } from './mappers/base-node-mapper';
import { ChoiceNodeMapper } from './mappers/choice-node-mapper';
import { CircuitBreakerNodeMapper } from './mappers/circuit-breaker-node-mapper';
import { DataMapperNodeMapper } from './mappers/datamapper-node-mapper';
import { FromNodeMapper } from './mappers/from-node-mapper';
import { LoadBalanceNodeMapper } from './mappers/loadbalance-node-mapper';
import { MulticastNodeMapper } from './mappers/multicast-node-mapper';
import { OnFallbackNodeMapper } from './mappers/on-fallback-node-mapper';
import { OtherwiseNodeMapper } from './mappers/otherwise-node-mapper';
import { RouteConfigurationNodeMapper } from './mappers/route-configuration-node-mapper';
import { StepNodeMapper } from './mappers/step-node-mapper';
import { WhenNodeMapper } from './mappers/when-node-mapper';
import { INodeMapper } from './node-mapper';
import { RootNodeMapper } from './root-node-mapper';

export class NodeMapperService {
  private static rootNodeMapper: RootNodeMapper;

  static async getVizNode(
    path: string,
    componentLookup: IVisualizationNodeIds,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    return this.getInstance().getVizNodeFromProcessor(path, componentLookup, entityDefinition);
  }

  private static getInstance(): INodeMapper {
    this.rootNodeMapper ??= NodeMapperService.createRootNodeMapper();

    return this.rootNodeMapper;
  }

  /** Creates the root node mapper with the default mapper and the processor specific ones */
  static createRootNodeMapper(): RootNodeMapper {
    const rootNodeMapper = new RootNodeMapper();
    rootNodeMapper.registerDefaultMapper(new BaseNodeMapper(rootNodeMapper));
    rootNodeMapper.registerMapper('from' as keyof ProcessorDefinition, new FromNodeMapper(rootNodeMapper));
    rootNodeMapper.registerMapper('circuitBreaker', new CircuitBreakerNodeMapper(rootNodeMapper));
    rootNodeMapper.registerMapper('onFallback' as keyof ProcessorDefinition, new OnFallbackNodeMapper(rootNodeMapper));
    rootNodeMapper.registerMapper('choice', new ChoiceNodeMapper(rootNodeMapper));
    rootNodeMapper.registerMapper('when' as keyof ProcessorDefinition, new WhenNodeMapper(rootNodeMapper));
    rootNodeMapper.registerMapper('otherwise' as keyof ProcessorDefinition, new OtherwiseNodeMapper(rootNodeMapper));
    rootNodeMapper.registerMapper('step', new StepNodeMapper(rootNodeMapper));
    rootNodeMapper.registerMapper(DATAMAPPER_ID_PREFIX, new DataMapperNodeMapper(rootNodeMapper));
    rootNodeMapper.registerMapper('multicast', new MulticastNodeMapper(rootNodeMapper));
    rootNodeMapper.registerMapper('loadBalance', new LoadBalanceNodeMapper(rootNodeMapper));

    /** Camel Route Configuration Node mapper */
    rootNodeMapper.registerMapper(
      'routeConfiguration' as keyof ProcessorDefinition,
      new RouteConfigurationNodeMapper(rootNodeMapper),
    );

    return rootNodeMapper;
  }
}
