import { RouteDefinition } from '@kaoto/camel-catalog/types';
import { parse } from 'yaml';

import { DATAMAPPER_ID_PREFIX } from '../../../../../utils';
import { RootNodeMapper } from '../root-node-mapper';
import { DataMapperNodeMapper } from './datamapper-node-mapper';
import { StepNodeMapper } from './step-node-mapper';
import { noopNodeMapper } from './testing/noop-node-mapper';

describe('StepNodeMapper', () => {
  let mapper: StepNodeMapper;
  let routeDefinition: RouteDefinition;
  let rootNodeMapper: RootNodeMapper;
  const path = 'from.steps.0.step';
  const path2 = 'from.steps.1.step';

  beforeEach(() => {
    rootNodeMapper = new RootNodeMapper();
    rootNodeMapper.registerDefaultMapper(mapper);
    rootNodeMapper.registerMapper('log', noopNodeMapper);
    rootNodeMapper.registerMapper(DATAMAPPER_ID_PREFIX, noopNodeMapper);

    mapper = new StepNodeMapper(rootNodeMapper);

    routeDefinition = parse(`
      from:
        id: from-8888
        uri: direct:start
        parameters: {}
        steps:
          - step:
              id: step-1234
              steps:
                - log:
                    id: log-1234
                    message: \${body}
          - step:
              id: step-5678
              steps:
                - log:
                    id: log-5678
                    message: \${body}`);
  });

  it('should return children', () => {
    const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: 'step' }, routeDefinition);

    expect(vizNode.getChildren()).toHaveLength(2);
    expect(vizNode.getChildren()?.[1].data.isPlaceholder).toBe(true);
  });

  it('should use path for viz node ID for non DataMapper step node', () => {
    const vizNode1 = mapper.getVizNodeFromProcessor(path, { processorName: 'step' }, routeDefinition);
    expect(vizNode1.id).toEqual('from.steps.0.step');
    expect(vizNode1.getChildren()).toHaveLength(2);
    expect(vizNode1.getChildren()?.[1].data.isPlaceholder).toBe(true);
    const vizNode2 = mapper.getVizNodeFromProcessor(path2, { processorName: 'step' }, routeDefinition);
    expect(vizNode2.id).toEqual('from.steps.1.step');
    expect(vizNode2.getChildren()).toHaveLength(2);
    expect(vizNode2.getChildren()?.[1].data.isPlaceholder).toBe(true);
  });

  it('should verify if this step node is a Kaoto DataMapper one', () => {
    const dataMapperNodeSpy = jest.spyOn(DataMapperNodeMapper, 'isDataMapperNode');

    mapper.getVizNodeFromProcessor(path, { processorName: 'step' }, routeDefinition);

    expect(dataMapperNodeSpy).toHaveBeenCalledWith(routeDefinition.from.steps[0].step);
  });

  it('should delegate to the rootNodeMapper if this step node is a Kaoto DataMapper one', () => {
    const rootNodeMapperSpy = jest.spyOn(rootNodeMapper, 'getVizNodeFromProcessor');
    const dataMapperNodeSpy = jest.spyOn(DataMapperNodeMapper, 'isDataMapperNode');
    dataMapperNodeSpy.mockReturnValue(true);

    mapper.getVizNodeFromProcessor(path, { processorName: 'step' }, routeDefinition);

    expect(rootNodeMapperSpy).toHaveBeenCalledWith(path, { processorName: DATAMAPPER_ID_PREFIX }, routeDefinition);
  });
});
