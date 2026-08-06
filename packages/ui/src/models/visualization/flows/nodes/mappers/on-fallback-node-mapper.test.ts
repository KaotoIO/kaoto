import { ProcessorDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { NodeIdentity } from '../../../node-identity';
import { RootNodeMapper } from '../root-node-mapper';
import { OnFallbackNodeMapper } from './on-fallback-node-mapper';
import { noopNodeMapper } from './testing/noop-node-mapper';

const ON_FALLBACK_NODE_ID: NodeIdentity = {
  name: 'onFallback' as keyof ProcessorDefinition,
  catalogKind: CatalogKind.Pattern,
};

describe('OnFallbackNodeMapper', () => {
  let mapper: OnFallbackNodeMapper;
  let routeDefinition: RouteDefinition;
  const path = 'from.steps.0.choice.onFallback';

  beforeEach(() => {
    const rootNodeMapper = new RootNodeMapper();
    rootNodeMapper.registerDefaultMapper(mapper);
    rootNodeMapper.registerMapper('log', noopNodeMapper);

    mapper = new OnFallbackNodeMapper(rootNodeMapper);

    routeDefinition = {
      from: {
        uri: 'timer',
        parameters: {
          timerName: 'timerName',
        },
        steps: [
          {
            circuitBreaker: {
              onFallback: {
                steps: [{ log: 'logName' }],
              },
            },
          },
        ],
      },
    };
  });

  it('should return children', async () => {
    const vizNode = await mapper.getVizNodeFromProcessor(path, ON_FALLBACK_NODE_ID, routeDefinition);

    expect(vizNode.getChildren()).toHaveLength(1);
  });

  it('should populate primaryNodeId', async () => {
    const vizNode = await mapper.getVizNodeFromProcessor(path, ON_FALLBACK_NODE_ID, routeDefinition);

    expect(vizNode.data.primaryNodeId).toEqual({ name: 'onFallback', catalogKind: CatalogKind.Pattern });
  });
});
