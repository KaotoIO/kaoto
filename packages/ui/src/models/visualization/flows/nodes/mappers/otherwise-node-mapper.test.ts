import { ProcessorDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';
import { RootNodeMapper } from '../root-node-mapper';
import { OtherwiseNodeMapper } from './otherwise-node-mapper';
import { noopNodeMapper } from './testing/noop-node-mapper';

describe('OtherwiseNodeMapper', () => {
  let mapper: OtherwiseNodeMapper;
  let routeDefinition: RouteDefinition;
  const path = 'from.steps.0.choice.otherwise';

  beforeEach(() => {
    const rootNodeMapper = new RootNodeMapper();
    rootNodeMapper.registerDefaultMapper(mapper);
    rootNodeMapper.registerMapper('log', noopNodeMapper);

    mapper = new OtherwiseNodeMapper(rootNodeMapper);

    routeDefinition = {
      from: {
        uri: 'timer',
        parameters: {
          timerName: 'timerName',
        },
        steps: [
          {
            choice: {
              when: [{ simple: "${header.foo} == 'bar'" }, { simple: "${header.foo} == 'baz'" }],
              otherwise: {
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
      { processorName: 'otherwise' as keyof ProcessorDefinition },
      routeDefinition,
    ).nodes[0];

    expect(vizNode.getChildren()).toHaveLength(1);
  });
});
