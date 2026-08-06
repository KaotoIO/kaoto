import { DATAMAPPER_ID_PREFIX } from '../../../../utils';
import { CatalogKind } from '../../../catalog-kind';
import { IVisualizationNode } from '../../base-visual-entity';
import { NodeIdentity } from '../../node-identity';
import { ICamelElementLookupResult } from '../support/camel-component-types';
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

  /**
   * Public entry point — still accepts the legacy `ICamelElementLookupResult` shape
   * so that visual entities don't need to change in this PR.
   * The adapter translates to NodeIdentity ids before forwarding into the pipeline.
   */
  static async getVizNode(
    path: string,
    componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const primaryNodeId: NodeIdentity = {
      name: componentLookup.processorName as string,
      catalogKind: CatalogKind.Pattern,
    };

    let secondaryNodeId: NodeIdentity | undefined;
    let tertiaryNodeId: NodeIdentity | undefined;

    if (componentLookup.componentName?.startsWith('kamelet:')) {
      secondaryNodeId = { name: 'kamelet', catalogKind: CatalogKind.Component };
      tertiaryNodeId = {
        name: componentLookup.componentName.replace('kamelet:', ''),
        catalogKind: CatalogKind.Kamelet,
      };
    } else if (componentLookup.componentName) {
      secondaryNodeId = { name: componentLookup.componentName, catalogKind: CatalogKind.Component };
    }

    return this.getInstance().getVizNodeFromProcessor(
      path,
      primaryNodeId,
      entityDefinition,
      secondaryNodeId,
      tertiaryNodeId,
    );
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
    this.rootNodeMapper.registerMapper('from', new FromNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('circuitBreaker', new CircuitBreakerNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('onFallback', new OnFallbackNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('choice', new ChoiceNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('when', new WhenNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('otherwise', new OtherwiseNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('step', new StepNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper(DATAMAPPER_ID_PREFIX, new DataMapperNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('multicast', new MulticastNodeMapper(this.rootNodeMapper));
    this.rootNodeMapper.registerMapper('loadBalance', new LoadBalanceNodeMapper(this.rootNodeMapper));

    /** Camel Route Configuration Node mapper */
    this.rootNodeMapper.registerMapper('routeConfiguration', new RouteConfigurationNodeMapper(this.rootNodeMapper));
  }
}
