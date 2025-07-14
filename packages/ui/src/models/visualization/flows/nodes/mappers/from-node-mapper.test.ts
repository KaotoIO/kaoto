import { ProcessorDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';
import { RootNodeMapper } from '../root-node-mapper';
import { noopNodeMapper } from './testing/noop-node-mapper';
import { FromNodeMapper } from './from-node-mapper';

describe('FromNodeMapper', () => {
  let mapper: FromNodeMapper;
  let routeDefinition: RouteDefinition;
  const path = 'from';

  beforeEach(() => {
    const rootNodeMapper = new RootNodeMapper();
    rootNodeMapper.registerDefaultMapper(mapper);
    rootNodeMapper.registerMapper('log', noopNodeMapper);

    mapper = new FromNodeMapper(rootNodeMapper);

    routeDefinition = {
      id: 'route-2207',
      from: {
        id: 'from-3790',
        uri: 'timer',
        parameters: {
          period: '1000',
          timerName: 'template',
        },
        steps: [
          {
            log: {
              id: 'log-2397',
              message: '${body}',
            },
          },
        ],
      },
    };
  });

  it('should return children for from node', () => {
    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'from' as keyof ProcessorDefinition },
      routeDefinition,
    );

    expect(vizNode.getChildren()).toHaveLength(1);
  });
});
