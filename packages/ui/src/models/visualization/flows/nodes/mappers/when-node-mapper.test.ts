import { ProcessorDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';
import { RootNodeMapper } from '../root-node-mapper';
import { noopNodeMapper } from './testing/noop-node-mapper';
import { WhenNodeMapper } from './when-node-mapper';

describe('WhenNodeMapper', () => {
  let mapper: WhenNodeMapper;
  let routeDefinition: RouteDefinition;
  const path = 'from.steps.0.choice.when.0';

  beforeEach(() => {
    const rootNodeMapper = new RootNodeMapper();
    rootNodeMapper.registerDefaultMapper(mapper);
    rootNodeMapper.registerMapper('log', noopNodeMapper);

    mapper = new WhenNodeMapper(rootNodeMapper);

    routeDefinition = {
      from: {
        uri: 'timer',
        parameters: {
          timerName: 'timerName',
        },
        steps: [
          {
            choice: {
              when: [
                { expression: { simple: { expression: "${header.foo} == 'bar'" } }, steps: [{ log: 'logName' }] },
                { expression: { simple: { expression: "${header.foo} == 'baz'" } }, steps: [{ log: 'logName' }] },
              ],
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
      { processorName: 'when' as keyof ProcessorDefinition },
      routeDefinition,
    ).nodes[0];

    expect(vizNode.getChildren()).toHaveLength(1);
  });
});
