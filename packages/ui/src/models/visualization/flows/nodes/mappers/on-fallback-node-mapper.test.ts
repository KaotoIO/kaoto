import { ProcessorDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';
import { RootNodeMapper } from '../root-node-mapper';
import { OnFallbackNodeMapper } from './on-fallback-node-mapper';
import { noopNodeMapper } from './testing/noop-node-mapper';

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

  it('should return children', () => {
    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'onFallback' as keyof ProcessorDefinition },
      routeDefinition,
    ).nodes[0];

    expect(vizNode.getChildren()).toHaveLength(1);
  });
});
