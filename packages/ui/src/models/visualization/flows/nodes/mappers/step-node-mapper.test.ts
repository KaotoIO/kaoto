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
                    message: \${body}`);
  });

  it('should return children', () => {
    const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: 'step' }, routeDefinition).nodes[0];

    expect(vizNode.getChildren()).toHaveLength(1);
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
