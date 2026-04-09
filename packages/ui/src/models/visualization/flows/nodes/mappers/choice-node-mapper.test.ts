import { ProcessorDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';

import { RootNodeMapper } from '../root-node-mapper';
import { ChoiceNodeMapper } from './choice-node-mapper';
import { OtherwiseNodeMapper } from './otherwise-node-mapper';
import { noopNodeMapper } from './testing/noop-node-mapper';
import { WhenNodeMapper } from './when-node-mapper';

describe('ChoiceNodeMapper', () => {
  let mapper: ChoiceNodeMapper;
  let routeDefinition: RouteDefinition;
  const path = 'from.steps.0.choice';

  beforeEach(() => {
    const rootNodeMapper = new RootNodeMapper();
    const whenNodeMapper = new WhenNodeMapper(rootNodeMapper);
    const otherwiseNodeMapper = new OtherwiseNodeMapper(rootNodeMapper);
    rootNodeMapper.registerDefaultMapper(mapper);
    rootNodeMapper.registerMapper('when' as keyof ProcessorDefinition, whenNodeMapper);
    rootNodeMapper.registerMapper('otherwise' as keyof ProcessorDefinition, otherwiseNodeMapper);
    rootNodeMapper.registerMapper('log', noopNodeMapper);

    mapper = new ChoiceNodeMapper(rootNodeMapper);

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

  it('should return children', async () => {
    const vizNode = await mapper.getVizNodeFromProcessor(path, { processorName: 'choice' }, routeDefinition);

    // When placeholder (first) + 2 when nodes + otherwise = 4 children
    expect(vizNode.getChildren()).toHaveLength(4);
  });

  it('should return when placeholder first, then `when` nodes as children', async () => {
    const vizNode = await mapper.getVizNodeFromProcessor(path, { processorName: 'choice' }, routeDefinition);

    expect(vizNode.getChildren()?.[0].data.path).toBe('from.steps.0.choice.when');
    expect(vizNode.getChildren()?.[0].data.isPlaceholder).toBe(true);
    expect(vizNode.getChildren()?.[1].data.path).toBe('from.steps.0.choice.when.0');
    expect(vizNode.getChildren()?.[2].data.path).toBe('from.steps.0.choice.when.1');
  });

  it('should return an `otherwise` node if defined', async () => {
    const vizNode = await mapper.getVizNodeFromProcessor(path, { processorName: 'choice' }, routeDefinition);

    expect(vizNode.getChildren()?.[3].data.path).toBe('from.steps.0.choice.otherwise');
    expect(vizNode.getChildren()?.[3].data.isPlaceholder).toBe(false);
  });

  it('should return an `otherwise` placeholder if not defined', async () => {
    routeDefinition.from.steps[0].choice!.otherwise = undefined;

    const vizNode = await mapper.getVizNodeFromProcessor(path, { processorName: 'choice' }, routeDefinition);

    // When placeholder + 2 when nodes + otherwise placeholder = 4 children
    expect(vizNode.getChildren()).toHaveLength(4);
    expect(vizNode.getChildren()?.[0].data.path).toBe('from.steps.0.choice.when');
    expect(vizNode.getChildren()?.[0].data.isPlaceholder).toBe(true);
    expect(vizNode.getChildren()?.[1].data.path).toBe('from.steps.0.choice.when.0');
    expect(vizNode.getChildren()?.[2].data.path).toBe('from.steps.0.choice.when.1');
    expect(vizNode.getChildren()?.[3].data.path).toBe('from.steps.0.choice.otherwise');
    expect(vizNode.getChildren()?.[3].data.isPlaceholder).toBe(true);
  });
});
