import { ProcessorDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';
import { RootNodeMapper } from '../root-node-mapper';
import { CircuitBreakerNodeMapper } from './circuit-breaker-node-mapper';
import { OnFallbackNodeMapper } from './on-fallback-node-mapper';
import { noopNodeMapper } from './testing/noop-node-mapper';

describe('CircuitBreakerNodeMapper', () => {
  let mapper: CircuitBreakerNodeMapper;
  let routeDefinition: RouteDefinition;
  const path = 'from.steps.0.circuitBreaker';

  beforeEach(() => {
    const rootNodeMapper = new RootNodeMapper();
    const onFallbackNodeMapper = new OnFallbackNodeMapper(rootNodeMapper);
    rootNodeMapper.registerDefaultMapper(mapper);
    rootNodeMapper.registerMapper('onFallback' as keyof ProcessorDefinition, onFallbackNodeMapper);
    rootNodeMapper.registerMapper('log', noopNodeMapper);

    mapper = new CircuitBreakerNodeMapper(rootNodeMapper);

    routeDefinition = {
      from: {
        uri: 'timer',
        parameters: {
          timerName: 'timerName',
        },
        steps: [
          {
            circuitBreaker: {
              steps: [{ log: 'step log' }],
              onFallback: {
                steps: [{ log: 'onFallback log' }],
              },
            },
          },
        ],
      },
    };
  });

  it('should return children', () => {
    const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: 'circuitBreaker' }, routeDefinition).nodes[0];

    expect(vizNode.getChildren()).toHaveLength(2);
  });

  it('should return step nodes as children', () => {
    const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: 'circuitBreaker' }, routeDefinition).nodes[0];

    expect(vizNode.getChildren()?.[0].data.path).toBe('from.steps.0.circuitBreaker.steps.0.log');
  });

  it('should return an `onFallback` node if defined', () => {
    const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: 'circuitBreaker' }, routeDefinition).nodes[0];

    expect(vizNode.getChildren()?.[1].data.path).toBe('from.steps.0.circuitBreaker.onFallback');
  });

  it('should not return an `onFallback` node if not defined', () => {
    routeDefinition.from.steps[0].circuitBreaker!.onFallback = undefined;

    const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: 'circuitBreaker' }, routeDefinition).nodes[0];

    expect(vizNode.getChildren()).toHaveLength(1);
    expect(vizNode.getChildren()?.[0].data.path).toBe('from.steps.0.circuitBreaker.steps.0.log');
  });
});
